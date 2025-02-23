import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

import re
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check that the API key is set
if not os.getenv("OPENAI_API_KEY"):
    logger.error("OPENAI_API_KEY environment variable is not set.")
    raise RuntimeError("The OPENAI_API_KEY environment variable is not set.")
else:
    logger.info("OpenAI API key loaded.")

# Initialize the OpenAI asynchronous client
aclient = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize FastAPI app
app = FastAPI(
    title="Question Generator API",
    description="Generates 50 questions for a given topic using the ChatGPT API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the request model
class TopicRequest(BaseModel):
    topic: str

# Define the /get-questions endpoint
@app.post("/get-questions", summary="Generate 50 questions", description="Uses the ChatGPT API to generate a numbered list of 50 questions about the given topic.")
async def get_questions(request: TopicRequest):
    logger.info(f"Received request for topic: {request.topic}")
    prompt = (
        f"Generate a numbered list of 50 interesting and diverse questions about the following topic: {request.topic}. "
        "Each question should be clearly numbered and on a new line."
        "the question should be all 3 levels easy , medium , difficult"
    )
    logger.info(f"Constructed prompt: {prompt}")

    try:
        logger.info("Sending request to OpenAI ChatCompletion API")
        response = await aclient.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
            n=1
        )
        logger.info("Received response from OpenAI API")
        answer = response.choices[0].message.content.strip()
        logger.info("Processed response and extracted answer")

        # Extract questions using regex
        logger.info("Extracting questions using regex")
        pattern = re.compile(r"^\d+\.\s*(.*)")
        questions = []
        for line in answer.splitlines():
            line = line.strip()
            if not line:
                continue
            match = pattern.match(line)
            if match:
                questions.append(match.group(1))
                logger.info(f"Extracted question: {match.group(1)}")
            else:
                questions.append(line)
                logger.info(f"Added line as question: {line}")

        logger.info(f"Total questions extracted: {len(questions)}")
        if len(questions) < 50:
            logger.warning(f"Expected 50 questions, but received {len(questions)}")
            return {
                "questions": questions,
                "warning": f"Expected 50 questions, but received {len(questions)}. Consider adjusting the prompt or max_tokens."
            }
        else:
            logger.info("Successfully extracted 50 questions")
            return {"questions": questions[:50]}

    except Exception as e:
        logger.error(f"Error occurred: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Run the FastAPI app with uvicorn if the script is executed directly
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")
