// @ts-nocheck
import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import React, { useEffect, useRef, useState } from "react";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import useDetectHands from "../utils/useDetectHands";
import { HandTrackingProps } from "../types/handTracking";
import { HandednessArray } from "../types/handTracking";
import { useHandStore } from "/useHandStore.ts"; // Correct way to import a named export

const HandTracking: React.FC<HandTrackingProps> = ({ isMobile }) => {
  // References to the video and canvas HTML elements
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    console.log(videoDimensions);
  }, [videoDimensions]);

  // buffer to calculate average pinch distance, like some easing
  const leftHandPinchBuffer = useRef(null);
  const rightHandPinchBuffer = useRef(null);

  useEffect(() => {
    if (isMobile === null || isMobile === undefined) return;
    async function setupHandTracking() {
      // Resolves the necessary resources for vision tasks
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      // Creates a new HandLandmarker object with configuration for CPU-based inference
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        }
      );
      // Initializes webcam stream
      enableWebcam();
    }

    function enableWebcam() {
      // Set up webcam constraints
      const dimensions = {
        width: isMobile ? 240 : 640,
        height: isMobile ? 320 : 480,
      };

      const constraints = { video: dimensions };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", () => {
            if (videoRef.current && typeof isMobile !== "undefined") {
              setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              });
            }
            setLoading(false);
            // Begins the webcam feed processing
            requestAnimationFrame(predictWebcam);
          });
        }
      });
    }

    async function predictWebcam() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Ensure video and canvas are properly loaded
      if (!video || video.readyState !== 4) {
        requestAnimationFrame(predictWebcam);
        return;
      }

      if (canvas) {
        const canvasCtx = canvas.getContext("2d");
        if (canvasCtx) {
          // Set canvas size equal to video size
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Detect hand landmarks from video
          const results = await handLandmarkerRef.current?.detectForVideo(
            video,
            performance.now()
          );

          // Drawing operations
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          canvasCtx.scale(-1, 1); // Mirror the video feed
          canvasCtx.translate(-canvas.width, 0);

          // Initialize a dictionary to store the landmarks for both hands
          let handLandmarks = {
            Left: {},
            Right: {},
          };

          function logAndStoreLandmarks(hand, landmarks, fingerIndices) {
            const handSide = hand === "Left" ? "leftFingers" : "rightFingers";
            const indexPos = landmarks[fingerIndices["index finger"]];
            const thumbPos = landmarks[fingerIndices.thumb];

            if (indexPos && thumbPos) {
              const { x: indexX, y: indexY } = indexPos;
              const { x: thumbX, y: thumbY } = thumbPos;
              console.log(`${hand} hand index landmarks:`, {
                x: indexX,
                y: indexY,
              });
              console.log(`${hand} hand thumb landmarks:`, {
                x: thumbX,
                y: thumbY,
              });

              // Update Zustand store here!
              useHandStore.getState().setFingerState(handSide, {
                index: { x: indexX, y: indexY },
                thumb: { x: thumbX, y: thumbY },
                previousIndex: { ...useHandStore.getState()[handSide].index }, // This assumes that 'previousIndex' is meant to hold the last 'index' state before the current update.
              });
            } else {
              console.log(
                `${hand} hand missing landmark data for index or thumb.`
              );
            }
          }

          const indexFinger = 8;
          const thumbFinger = 4;

          for (let i = 0; i < results.handednesses.length; i++) {
            const handedness = results.handednesses[i];
            if (handedness.length > 0) {
              const hand = handedness[0]; // Assuming only one handedness per hand
              const fingerIndices = {
                "index finger": indexFinger,
                thumb: thumbFinger,
              };

              if (hand.displayName === "Left" || hand.displayName === "Right") {
                logAndStoreLandmarks(
                  hand.displayName,
                  results.landmarks[i],
                  fingerIndices
                );
              }
            } else {
              console.log("No hand found.");
            }
          }

          canvasCtx.restore();
          // Request next frame processing
          requestAnimationFrame(predictWebcam);
        }
      }
    }

    // Initiate the hand tracking setup
    setupHandTracking();
  }, [isMobile]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        width: `${videoDimensions.width}px`,
        height: `${videoDimensions.height}px`,
      }}
    >
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.7)",
            color: "rgba(33, 37, 41, 0.938)",
            fontSize: "20px",
            zIndex: 1000,
            top: 0,
            left: 0,
          }}
        >
          <p>
            Loading <br /> model...
          </p>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "scaleX(-1)",
          width: "100%",
          height: "auto",
          borderRadius: "25px",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "auto",
          borderRadius: "25px",
        }}
      />
    </div>
  );
};

export default HandTracking;
