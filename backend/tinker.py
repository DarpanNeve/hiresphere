import tkinter as tk
from tkinter import messagebox, scrolledtext
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import pygame
import speech_recognition as sr
import logging
import sys
import time
from typing import List, Dict, Optional
from gtts import gTTS
import tempfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('interview_app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class InterviewApp:
    """Main application class for the Interview AI system"""
    
    def __init__(self, root: tk.Tk):
        """Initialize the application"""
        self.root = root
        self.root.title("Interview AI")
        self.root.geometry("1000x800")
        self.root.configure(bg="#f0f0f0")
        
        # Application state
        self.selected_topic: str = ""
        self.questions: List[str] = []
        self.responses: List[str] = []
        self.current_question: int = 0
        self.audio_output_available: bool = False
        self.audio_input_available: bool = False
        
        # Initialize components
        self._verify_dependencies()
        self._initialize_audio()
        self._setup_gui()
        self._create_openai_client()
        
        # Set focus to main window
        self.root.focus_force()

    def _verify_dependencies(self) -> None:
        """Check for required dependencies"""
        try:
            import gtts  # noqa: F401
        except ImportError:
            logger.error("gTTS not installed")
            messagebox.showerror(
                "Missing Dependency",
                "Please install gTTS: pip install gTTS"
            )
            sys.exit(1)

    def _create_openai_client(self) -> None:
        """Initialize OpenAI client with validation"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OpenAI API key not found in environment")
            messagebox.showerror(
                "Configuration Error",
                "OPENAI_API_KEY not found in .env file"
            )
            sys.exit(1)
        
        self.client = OpenAI(api_key=api_key)

    def _initialize_audio(self) -> None:
        """Initialize audio systems with comprehensive error handling"""
        # Initialize audio output
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=4096)
            self.audio_output_available = True
            logger.info("Audio output initialized successfully")
        except pygame.error as e:
            logger.error(f"PyGame mixer initialization failed: {str(e)}")
            self.audio_output_available = False

        # Initialize audio input
        try:
            self.recognizer = sr.Recognizer()
            with sr.Microphone() as source:
                logger.info("Calibrating microphone...")
                self.recognizer.adjust_for_ambient_noise(source, duration=2)
                self.audio_input_available = True
                logger.info("Microphone initialized successfully")
        except Exception as e:
            logger.error(f"Microphone initialization failed: {str(e)}")
            self.audio_input_available = False

    def _setup_gui(self) -> None:
        """Configure the GUI components"""
        # Common styling
        self.font_style = ("Helvetica", 14)
        self.title_font = ("Helvetica", 24, "bold")

        # Topic selection frame
        self.topic_frame = tk.Frame(self.root, bg="#f0f0f0")
        self._setup_topic_frame()

        # Interview frame
        self.interview_frame = tk.Frame(self.root, bg="#f0f0f0")
        self._setup_interview_frame()

        # Start with topic selection
        self.topic_frame.pack(fill=tk.BOTH, expand=True)

    def _setup_topic_frame(self) -> None:
        """Configure the topic selection interface"""
        tk.Label(self.topic_frame, text="Select Interview Topic", 
                font=self.title_font, bg="#f0f0f0").pack(pady=20)

        # Predefined topics grid
        topics_grid = tk.Frame(self.topic_frame, bg="#f0f0f0")
        topics_grid.pack(pady=10)

        predefined_topics = [
            "Software Engineering", "Data Science",
            "Product Management", "UX Design"
        ]
        
        for i, topic in enumerate(predefined_topics):
            btn = tk.Button(
                topics_grid, text=topic, font=self.font_style, width=25,
                command=lambda t=topic: self.select_topic(t),
                bg="#4CAF50", fg="white", padx=10, pady=5
            )
            btn.grid(row=i//2, column=i%2, padx=10, pady=10)

        # Custom topic entry
        custom_frame = tk.Frame(self.topic_frame, bg="#f0f0f0")
        custom_frame.pack(pady=20)

        tk.Label(custom_frame, text="Custom Topic:", 
                font=self.font_style, bg="#f0f0f0").pack(side=tk.LEFT)
        self.custom_topic_entry = tk.Entry(custom_frame, font=self.font_style, width=30)
        self.custom_topic_entry.pack(side=tk.LEFT, padx=5)
        tk.Button(
            custom_frame, text="Submit", font=self.font_style,
            command=self.submit_custom_topic, bg="#2196F3", fg="white"
        ).pack(side=tk.LEFT)

    def _setup_interview_frame(self) -> None:
        """Configure the interview interface"""
        self.question_label = tk.Label(
            self.interview_frame, text="", font=self.font_style,
            wraplength=800, bg="#ffffff", padx=20, pady=20
        )
        self.question_label.pack(pady=20, padx=20, fill=tk.X)

        controls = tk.Frame(self.interview_frame, bg="#f0f0f0")
        controls.pack(pady=10)

        self.record_btn = tk.Button(
            controls, text="Record Answer", font=self.font_style,
            command=self.record_response, bg="#FF5722", fg="white"
        )
        self.record_btn.pack(side=tk.LEFT, padx=10)

        self.result_text_widget = scrolledtext.ScrolledText(
            self.interview_frame, font=("Helvetica", 12),
            wrap=tk.WORD, height=20, state=tk.DISABLED
        )
        self.result_text_widget.pack(pady=20, padx=20, fill=tk.BOTH, expand=True)

    def select_topic(self, topic: str) -> None:
        """Set interview topic and start interview"""
        self.selected_topic = topic.strip()
        if not self.selected_topic:
            messagebox.showwarning("Invalid Topic", "Please select a valid topic")
            return
            
        logger.info(f"Selected topic: {self.selected_topic}")
        self.topic_frame.pack_forget()
        self.interview_frame.pack(fill=tk.BOTH, expand=True)
        self.start_interview()

    def submit_custom_topic(self) -> None:
        """Handle custom topic submission"""
        topic = self.custom_topic_entry.get().strip()
        if topic:
            self.select_topic(topic)
        else:
            messagebox.showwarning("Empty Topic", "Please enter a topic")

    def start_interview(self) -> None:
        """Start new interview session"""
        self.current_question = 0
        self.responses = []
        self._load_questions()
        
        if self.questions:
            self._show_question()
        else:
            messagebox.showwarning(
                "Error",
                "Failed to load questions. Please try another topic."
            )
            self._return_to_topic_selection()

    def _load_questions(self) -> None:
        """Fetch questions from OpenAI API"""
        prompt = (
            f"Generate a JSON array of 5 unique interview questions about {self.selected_topic}. "
            "Each question should be a string. Respond with valid JSON only."
        )
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            content = response.choices[0].message.content
            self.questions = json.loads(content)
            logger.info(f"Loaded {len(self.questions)} questions")
        except json.JSONDecodeError:
            logger.error("Failed to parse questions JSON")
            self.questions = []
        except Exception as e:
            logger.error(f"Question generation failed: {str(e)}")
            self.questions = []

    def _show_question(self) -> None:
        """Display current question and read it aloud"""
        if self.current_question >= len(self.questions):
            self._show_results()
            return

        question = self.questions[self.current_question]
        self.question_label.config(text=question)
        self._read_aloud(question)

    def _read_aloud(self, text: str) -> None:
        """Convert text to speech with proper resource cleanup"""
        if not self.audio_output_available:
            messagebox.showinfo("Audio Disabled", "Text-to-speech unavailable")
            return

        try:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
                tts = gTTS(text=text, lang='en')
                tts.save(fp.name)
                
                pygame.mixer.music.load(fp.name)
                pygame.mixer.music.play()
                
                # Wait for playback to finish
                while pygame.mixer.music.get_busy():
                    pygame.time.Clock().tick(10)
                
                pygame.mixer.music.unload()
            os.remove(fp.name)
        except Exception as e:
            logger.error(f"Text-to-speech error: {str(e)}")
            messagebox.showwarning("Audio Error", "Failed to play audio")

    def record_response(self) -> None:
        """Handle response recording with status feedback"""
        self.record_btn.config(state=tk.DISABLED)
        
        if not self.audio_input_available:
            logger.warning("Audio input not available, showing text input")
            self._show_text_input()
            return

        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
                messagebox.showinfo("Recording", "Speak now... (max 30 seconds)")
                
                audio = self.recognizer.listen(
                    source, timeout=10, phrase_time_limit=30
                )
                self._process_audio(audio)
                
        except sr.UnknownValueError:
            logger.warning("Could not understand audio input")
            messagebox.showerror("Error", "Could not understand audio")
        except sr.RequestError as e:
            logger.error(f"Speech recognition service error: {str(e)}")
            messagebox.showerror("Error", f"Speech service error: {str(e)}")
        except Exception as e:
            logger.error(f"Recording failed: {str(e)}")
            messagebox.showerror("Error", f"Recording failed: {str(e)}")
        finally:
            self.record_btn.config(state=tk.NORMAL)

    def _process_audio(self, audio: sr.AudioData) -> None:
        """Process recorded audio and update state"""
        processing = tk.Toplevel()
        processing.title("Processing")
        tk.Label(processing, text="Analyzing audio...").pack(pady=10)
        processing.update()
        
        try:
            text = self.recognizer.recognize_google(audio)
            self.responses.append(text)
            self.current_question += 1
            logger.info(f"Recorded response: {text[:50]}...")
        finally:
            processing.destroy()
            self._show_question()

    def _show_text_input(self) -> None:
        """Show fallback text input dialog"""
        text_input = tk.Toplevel()
        text_input.title("Type Response")
        text_input.geometry("400x300")
        
        response_text = scrolledtext.ScrolledText(
            text_input, height=10, wrap=tk.WORD
        )
        response_text.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)
        
        def submit():
            if response := response_text.get("1.0", tk.END).strip():
                self.responses.append(response)
                self.current_question += 1
                text_input.destroy()
                self._show_question()
            else:
                messagebox.showwarning("Empty", "Please enter a response")
        
        tk.Button(text_input, text="Submit", command=submit).pack(pady=5)

    def _show_results(self) -> None:
        """Display interview results with feedback"""
        result_text = "Interview Results:\n\n"
        for i, (q, r) in enumerate(zip(self.questions, self.responses)):
            feedback = self._analyze_response(r)
            result_text += f"Question {i+1}:\n{q}\n"
            result_text += f"Your Answer:\n{r}\n"
            result_text += f"Feedback:\n{feedback}\n\n{'='*50}\n\n"
        
        self.result_text_widget.config(state=tk.NORMAL)
        self.result_text_widget.delete(1.0, tk.END)
        self.result_text_widget.insert(tk.END, result_text)
        self.result_text_widget.config(state=tk.DISABLED)

    def _analyze_response(self, response: str) -> str:
        """Analyze user response using OpenAI API"""
        try:
            prompt = f"Provide brief, constructive feedback for this interview answer: '{response}'"
            analysis = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            return analysis.choices[0].message.content
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return "Feedback unavailable due to analysis error"

    def _return_to_topic_selection(self) -> None:
        """Return to topic selection screen"""
        self.interview_frame.pack_forget()
        self.topic_frame.pack(fill=tk.BOTH, expand=True)
        self.selected_topic = ""
        self.questions = []
        self.responses = []

if __name__ == "__main__":
    root = tk.Tk()
    app = InterviewApp(root)
    root.mainloop()