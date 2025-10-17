import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import React from "react";

function FaceScanner({ faceOn }) {
  // Refs to directly access video and canvas elements in the DOM
  const videoRef = useRef();
  const canvasRef = useRef();

  // Holds the face descriptor (128-number vector) of the registered image
  const [registeredDescriptor, setRegisteredDescriptor] = useState(null);

  // A ref version for immediate descriptor access (no re-render delay)
  const registeredDescriptorRef = useRef(null);

  // State that tracks if all FaceAPI models are loaded
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    // Interval ID for continuous detection loop
    let intervalId = null;

    /**
     * 📸 Starts the webcam feed and attaches it to the video element
     */
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true }) // Ask permission to access the camera
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log("Video metadata loaded");

            // When video actually starts playing, begin face detection loop
            videoRef.current.onplaying = () => {
              console.log("✅ Video feed is live");
              if (!intervalId) {
                intervalId = setInterval(detectMyFace, 500); // Run detection every 500ms
              }
            };
          }
        })
        .catch((err) => console.error("❌ Camera permission denied:", err));
    };

    /**
     * 🛑 Stops the webcam and clears the detection interval
     */
    const stopVideo = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        console.log("🛑 Camera stopped");
      }
      if (intervalId) clearInterval(intervalId);
    };

    /**
     * ⚙️ Loads all required face-api.js models
     * - TinyFaceDetector: detects faces quickly
     * - FaceLandmark68Net: detects facial features (eyes, nose, mouth, etc.)
     * - FaceRecognitionNet: generates a unique face descriptor (128D vector)
     * - SsdMobilenetv1: optional — more accurate detector
     */
    const loadModels = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models/face-api"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models/face-api"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models/face-api"),
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models/face-api"),
      ]);
      console.log("✅ Models loaded");
      setModelsLoaded(true);
    };

    /**
     * 🧍‍♂️ Loads a stored image and extracts its unique face descriptor
     * This descriptor will be compared later with the live camera feed
     */
    const faceRegister = async () => {
      const img = await faceapi.fetchImage("/models/face/face.jpg");

      // Detect single face + landmarks + generate descriptor
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log("⚠️ No face found in registration image");
        return;
      }

      // Store descriptor in both state and ref
      setRegisteredDescriptor(detection.descriptor);
      registeredDescriptorRef.current = detection.descriptor;

      console.log("✅ Face descriptor loaded");
    };

    /**
     * 🧠 Continuously detects faces from webcam feed
     * - Gets real-time face descriptor(s)
     * - Compares with the registered face descriptor
     * - Logs whether it’s a match or not
     */
    const detectMyFace = async () => {
      // Ensure video and canvas are ready
      if (!videoRef.current || !canvasRef.current) return;

      // Detect all faces in the current video frame
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Prepare the canvas to match the video size
      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };
      if (!displaySize.width || !displaySize.height) return; // Avoid running before video metadata loads

      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Clear and redraw detections every frame
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);

      // Wait until the registered descriptor is available
      const descriptor = registeredDescriptorRef.current;
      if (!descriptor) {
        console.log("⏳ Waiting for registered face descriptor...");
        return;
      }

      // Create a labeled descriptor for the registered face
      const labeledDescriptor = new faceapi.LabeledFaceDescriptors(
        "Registered User",
        [new Float32Array(descriptor)]
      );

      // FaceMatcher: compares live face with registered one using Euclidean distance
      // 0.6 is the similarity threshold — lower = stricter
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptor, 0.6);

      // For each detected face, compare with the registered descriptor
      resizedDetections.forEach((det) => {
        const bestMatch = faceMatcher.findBestMatch(det.descriptor);

        // Simple console output: just say if it’s match or not
        if (bestMatch.label === "unknown") {
          console.log("❌ Face Dont Match");
        } else {
          console.log("✅ Face Match");
        }

        // Draw a box with color based on match result
        const box = det.detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: bestMatch.label === "unknown" ? "❌ Not Match" : "✅Face Match",
          boxColor: bestMatch.label === "unknown" ? "red" : "green",
        });
        drawBox.draw(canvas);
      });
    };

    /**
     * 🚀 Initializes the system:
     * 1. Loads face-api.js models
     * 2. Registers the reference face
     * 3. Starts the webcam feed
     * 4. Begins continuous detection loop
     */
    const init = async () => {
      if (!modelsLoaded) {
        await loadModels();
      }
      await faceRegister();
      startVideo();
      intervalId = setInterval(detectMyFace, 300); // double safety interval start
    };

    // Initialize only when faceOn prop is true (used to toggle scanner visibility)
    if (faceOn) init();

    // Cleanup: stop the video and clear the interval when component unmounts or faceOn is false
    return () => stopVideo();
  }, [faceOn]);

  // Video element displays the webcam feed
  // Canvas overlays detection boxes and labels
  return (
    <div className="relative w-full h-full bg-gray-500">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}

export default FaceScanner;
