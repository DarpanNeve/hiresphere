import { useState, useEffect, useRef } from "react";
import { InterviewMonitor } from "./InterviewMonitor";
import toast from "react-hot-toast";

export const useInterviewMonitoring = (videoRef, options = {}) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [isTerminated, setIsTerminated] = useState(false);
  const monitorRef = useRef(null);

  useEffect(() => {
    return () => {
      if (monitorRef.current) {
        monitorRef.current.stopMonitoring();
      }
    };
  }, []);

  const initializeMonitoring = async () => {
    try {
      monitorRef.current = new InterviewMonitor({
        maxWarnings: 3,
        warningTimeout: 100,
        ...options,
      });

      // Set callbacks directly on the callbacks object
      monitorRef.current.callbacks = {
        onWarning: (warning) => {
          setWarnings((prev) => [...prev, warning]);
          toast.error(
            `Warning ${warning.warningNumber}/3: ${warning.reason}. ${warning.remainingWarnings} warnings remaining.`,
            {
              duration: 5000,
              icon: "⚠️",
            }
          );
        },
        onTerminate: (data) => {
          setIsTerminated(true);
          toast.error("Interview terminated: Maximum warnings exceeded", {
            duration: 5000,
            icon: "🚫",
          });
          if (options.onTerminate) {
            options.onTerminate(data);
          }
        },
      };

      const initialized = await monitorRef.current.initialize();
      if (!initialized) {
        throw new Error("Failed to initialize monitoring system");
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize monitoring:", error);
      toast.error("Failed to initialize interview monitoring");
      return false;
    }
  };

  const startMonitoring = async () => {
    if (!videoRef.current?.video) {
      toast.error("Video feed not available");
      return false;
    }

    try {
      if (!monitorRef.current) {
        const initialized = await initializeMonitoring();
        if (!initialized) return false;
      }

      monitorRef.current.startMonitoring(videoRef.current.video);
      setIsMonitoring(true);
      return true;
    } catch (error) {
      console.error("Failed to start monitoring:", error);
      toast.error("Failed to start interview monitoring");
      return false;
    }
  };

  const stopMonitoring = () => {
    if (monitorRef.current) {
      monitorRef.current.stopMonitoring();
      setIsMonitoring(false);
    }
  };

  return {
    initialize: initializeMonitoring,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    warnings,
    isTerminated,
  };
};
