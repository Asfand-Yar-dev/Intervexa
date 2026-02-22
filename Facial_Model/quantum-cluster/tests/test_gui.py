"""
Webcam Testing GUI for Facial Expression Analysis

Premium real-time testing interface with a side-panel metrics dashboard,
colour-coded progress bars for Confidence / Nervousness / Engagement /
Eye Contact, and a detailed feedback report screen on session end.

Author: AI Developer Team
Date: 2026-01-21  (Updated: 2026-02-18)
"""

import cv2
import sys
import os
import numpy as np
from datetime import datetime
import logging
import time

# Add parent dir so we can import the model
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.Facial_AI_Module import FacialExpressionModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ======================================================================
#  Colour palette  (BGR for OpenCV)
# ======================================================================
BG_DARK      = (30, 30, 35)
BG_PANEL     = (40, 40, 48)
BG_CARD      = (50, 50, 58)
TEXT_WHITE    = (255, 255, 255)
TEXT_DIM      = (160, 160, 170)
TEXT_CYAN     = (230, 200, 60)      # accent cyan-ish
ACCENT_CYAN   = (230, 200, 60)
BAR_BG       = (70, 70, 80)
GREEN        = (100, 210, 80)
YELLOW       = (60, 210, 220)
ORANGE       = (50, 150, 240)
RED          = (70, 70, 230)
FACE_BOX     = (200, 255, 100)
STATUS_GREEN = (100, 220, 100)
STATUS_RED   = (80, 80, 220)


def score_colour(score: float, invert: bool = False) -> tuple:
    """Return a BGR colour for a 0-100 score (green=good).
    If ``invert`` the colour mapping is flipped (lower = green)."""
    s = (100 - score) if invert else score
    if s >= 75:
        return GREEN
    if s >= 50:
        return YELLOW
    if s >= 25:
        return ORANGE
    return RED


def draw_rounded_rect(img, pt1, pt2, colour, thickness=1, radius=10, fill=False):
    """Draw a rectangle with rounded corners."""
    x1, y1 = pt1
    x2, y2 = pt2
    r = min(radius, (x2 - x1) // 2, (y2 - y1) // 2)

    if fill:
        # Fill centre
        cv2.rectangle(img, (x1 + r, y1), (x2 - r, y2), colour, -1)
        cv2.rectangle(img, (x1, y1 + r), (x2, y2 - r), colour, -1)
        # Four corners
        cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180, 0, 90, colour, -1)
        cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270, 0, 90, colour, -1)
        cv2.ellipse(img, (x2 - r, y2 - r), (r, r), 0, 0, 90, colour, -1)
        cv2.ellipse(img, (x1 + r, y2 - r), (r, r), 90, 0, 90, colour, -1)
    else:
        # Top / bottom
        cv2.line(img, (x1 + r, y1), (x2 - r, y1), colour, thickness)
        cv2.line(img, (x1 + r, y2), (x2 - r, y2), colour, thickness)
        # Left / right
        cv2.line(img, (x1, y1 + r), (x1, y2 - r), colour, thickness)
        cv2.line(img, (x2, y1 + r), (x2, y2 - r), colour, thickness)
        # Corner arcs
        cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180, 0, 90, colour, thickness)
        cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270, 0, 90, colour, thickness)
        cv2.ellipse(img, (x2 - r, y2 - r), (r, r), 0, 0, 90, colour, thickness)
        cv2.ellipse(img, (x1 + r, y2 - r), (r, r), 90, 0, 90, colour, thickness)


def draw_progress_bar(canvas, x, y, w, h, score, colour, label="", show_pct=True):
    """Draw a labelled horizontal progress bar."""
    # Label
    if label:
        cv2.putText(canvas, label, (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.48, TEXT_DIM, 1, cv2.LINE_AA)

    # Background track
    draw_rounded_rect(canvas, (x, y), (x + w, y + h), BAR_BG, fill=True, radius=h // 2)

    # Filled portion
    fill_w = int(w * max(0, min(score, 100)) / 100)
    if fill_w > 0:
        draw_rounded_rect(canvas, (x, y), (x + fill_w, y + h), colour, fill=True, radius=h // 2)

    # Percentage text
    if show_pct:
        pct_txt = f"{int(score)}%"
        cv2.putText(canvas, pct_txt, (x + w + 8, y + h - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, TEXT_WHITE, 1, cv2.LINE_AA)


# ======================================================================
#  GUI class
# ======================================================================
class EmotionDetectionGUI:
    # Canvas layout constants
    WEBCAM_W, WEBCAM_H = 620, 465
    PANEL_W = 370
    TOP_BAR_H = 55
    BOTTOM_BAR_H = 45
    PAD = 12

    def __init__(self, camera_id: int = 0, skip_frames: int = 5):
        self.camera_id = camera_id
        self.skip_frames = skip_frames
        self.frame_counter = 0
        self.start_time = time.time()

        # Current state
        self.current_emotion = "Initializing..."
        self.current_confidence = 0.0
        self.face_coords = None
        self.eye_contact_score = 0.0
        self.is_face_present = False
        self.interview_metrics = {"confidence": 0, "nervousness": 0, "engagement": 0}

        # Smooth values for animation
        self._smooth_conf = 0.0
        self._smooth_nerv = 0.0
        self._smooth_eng  = 0.0
        self._smooth_eye  = 0.0

        # Load model
        logger.info("Loading Facial Expression Model...")
        self.model = FacialExpressionModel(history_size=5)

        self.window_name = "Smart Mock Interview - Facial Analysis"
        self.fps = 0.0
        self.last_time = datetime.now()

        # Calculate canvas size
        self.canvas_w = self.PAD + self.WEBCAM_W + self.PAD + self.PANEL_W + self.PAD
        self.canvas_h = self.TOP_BAR_H + self.PAD + max(self.WEBCAM_H, 470) + self.PAD + self.BOTTOM_BAR_H

    # ------------------------------------------------------------------
    #  Camera
    # ------------------------------------------------------------------
    def _init_camera(self) -> cv2.VideoCapture:
        logger.info(f"Opening camera {self.camera_id}...")
        cap = cv2.VideoCapture(self.camera_id, cv2.CAP_DSHOW)
        if not cap.isOpened():
            raise RuntimeError("Could not access webcam.")
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        logger.info("✓ Camera opened successfully!")
        return cap

    # ------------------------------------------------------------------
    #  FPS
    # ------------------------------------------------------------------
    def _calc_fps(self):
        now = datetime.now()
        dt = (now - self.last_time).total_seconds()
        self.fps = 1.0 / dt if dt > 0 else 0
        self.last_time = now

    # ------------------------------------------------------------------
    #  Smooth animation helpers
    # ------------------------------------------------------------------
    def _lerp(self, current, target, speed=0.15):
        return current + (target - current) * speed

    def _update_smooth_values(self):
        m = self.interview_metrics
        self._smooth_conf = self._lerp(self._smooth_conf, m["confidence"])
        self._smooth_nerv = self._lerp(self._smooth_nerv, m["nervousness"])
        self._smooth_eng  = self._lerp(self._smooth_eng, m["engagement"])
        self._smooth_eye  = self._lerp(self._smooth_eye, self.eye_contact_score)

    # ------------------------------------------------------------------
    #  Draw helpers
    # ------------------------------------------------------------------
    def _draw_top_bar(self, canvas):
        """Dark gradient title bar."""
        overlay = canvas.copy()
        cv2.rectangle(overlay, (0, 0), (self.canvas_w, self.TOP_BAR_H), (20, 20, 25), -1)
        cv2.addWeighted(overlay, 0.85, canvas, 0.15, 0, canvas)

        cv2.putText(canvas, "SMART MOCK INTERVIEW", (self.PAD + 4, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, ACCENT_CYAN, 2, cv2.LINE_AA)
        cv2.putText(canvas, "Facial Expression Analyser", (self.PAD + 4, 48),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, TEXT_DIM, 1, cv2.LINE_AA)

        # Timer
        elapsed = time.time() - self.start_time
        mins, secs = divmod(int(elapsed), 60)
        timer_txt = f"{mins:02d}:{secs:02d}"
        cv2.putText(canvas, timer_txt, (self.canvas_w - 90, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, TEXT_WHITE, 2, cv2.LINE_AA)

    def _draw_bottom_bar(self, canvas):
        y = self.canvas_h - self.BOTTOM_BAR_H
        overlay = canvas.copy()
        cv2.rectangle(overlay, (0, y), (self.canvas_w, self.canvas_h), (20, 20, 25), -1)
        cv2.addWeighted(overlay, 0.85, canvas, 0.15, 0, canvas)

        instructions = "Q  Quit & View Report   |   R  Reset Session   |   S  Print Stats"
        cv2.putText(canvas, instructions, (self.PAD + 4, y + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, TEXT_DIM, 1, cv2.LINE_AA)

        fps_txt = f"FPS: {self.fps:.0f}"
        cv2.putText(canvas, fps_txt, (self.canvas_w - 100, y + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, TEXT_DIM, 1, cv2.LINE_AA)

    def _draw_webcam(self, canvas, frame):
        """Place the webcam feed with a face bounding box."""
        x0 = self.PAD
        y0 = self.TOP_BAR_H + self.PAD

        display = cv2.resize(frame, (self.WEBCAM_W, self.WEBCAM_H))

        # Face bounding box
        if self.face_coords and self.face_coords.get("w", 0) > 0:
            # Scale coords from original 640x480 → WEBCAM_W x WEBCAM_H
            sx = self.WEBCAM_W / 640.0
            sy = self.WEBCAM_H / 480.0
            bx = int(self.face_coords["x"] * sx)
            by = int(self.face_coords["y"] * sy)
            bw = int(self.face_coords["w"] * sx)
            bh = int(self.face_coords["h"] * sy)

            cv2.rectangle(display, (bx, by), (bx + bw, by + bh), FACE_BOX, 2)
            label = f"{self.current_emotion} ({self.current_confidence:.0f}%)"
            label_y = by - 10 if by - 10 > 15 else by + bh + 20
            cv2.putText(display, label, (bx, label_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, FACE_BOX, 2, cv2.LINE_AA)

        # Border around webcam
        canvas[y0:y0 + self.WEBCAM_H, x0:x0 + self.WEBCAM_W] = display
        cv2.rectangle(canvas, (x0 - 1, y0 - 1),
                      (x0 + self.WEBCAM_W + 1, y0 + self.WEBCAM_H + 1), BG_CARD, 2)

    def _draw_metrics_panel(self, canvas):
        """Draw the right-side metrics dashboard."""
        px = self.PAD + self.WEBCAM_W + self.PAD
        py = self.TOP_BAR_H + self.PAD
        pw = self.PANEL_W
        ph = self.WEBCAM_H

        # Panel background
        draw_rounded_rect(canvas, (px, py), (px + pw, py + ph), BG_PANEL, fill=True, radius=12)
        draw_rounded_rect(canvas, (px, py), (px + pw, py + ph), BG_CARD, thickness=1, radius=12)

        inner_x = px + 18
        bar_w = pw - 90

        # --- Face Status ---
        cy = py + 30
        status_col = STATUS_GREEN if self.is_face_present else STATUS_RED
        status_txt = "Face Detected" if self.is_face_present else "No Face"
        cv2.circle(canvas, (inner_x + 6, cy), 6, status_col, -1)
        cv2.putText(canvas, status_txt, (inner_x + 20, cy + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, TEXT_WHITE, 1, cv2.LINE_AA)

        # --- Current Emotion ---
        cy += 35
        cv2.putText(canvas, "Emotion:", (inner_x, cy),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, TEXT_DIM, 1, cv2.LINE_AA)
        cv2.putText(canvas, self.current_emotion.capitalize(), (inner_x + 80, cy),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, TEXT_WHITE, 1, cv2.LINE_AA)

        # --- Separator ---
        cy += 20
        cv2.line(canvas, (inner_x, cy), (px + pw - 18, cy), BG_CARD, 1)

        # --- Section title ---
        cy += 28
        cv2.putText(canvas, "INTERVIEW METRICS", (inner_x, cy),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, ACCENT_CYAN, 1, cv2.LINE_AA)

        # --- Confidence bar ---
        cy += 30
        draw_progress_bar(canvas, inner_x, cy, bar_w, 16,
                          self._smooth_conf, score_colour(self._smooth_conf), "Confidence")

        # --- Nervousness bar ---
        cy += 50
        draw_progress_bar(canvas, inner_x, cy, bar_w, 16,
                          self._smooth_nerv, score_colour(self._smooth_nerv, invert=True), "Nervousness")

        # --- Engagement bar ---
        cy += 50
        draw_progress_bar(canvas, inner_x, cy, bar_w, 16,
                          self._smooth_eng, score_colour(self._smooth_eng), "Engagement")

        # --- Eye Contact bar ---
        cy += 50
        draw_progress_bar(canvas, inner_x, cy, bar_w, 16,
                          self._smooth_eye, score_colour(self._smooth_eye), "Eye Contact")

        # --- Separator ---
        cy += 35
        cv2.line(canvas, (inner_x, cy), (px + pw - 18, cy), BG_CARD, 1)

        # --- Mini emotion breakdown ---
        cy += 20
        cv2.putText(canvas, "TOP EMOTIONS", (inner_x, cy),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, ACCENT_CYAN, 1, cv2.LINE_AA)

        if hasattr(self, "_all_emotions") and self._all_emotions:
            sorted_emo = sorted(self._all_emotions.items(), key=lambda x: x[1], reverse=True)[:4]
            for emo_name, emo_val in sorted_emo:
                cy += 22
                cv2.putText(canvas, f"{emo_name}:", (inner_x + 4, cy),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, TEXT_DIM, 1, cv2.LINE_AA)
                cv2.putText(canvas, f"{emo_val:.1f}%", (inner_x + 100, cy),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, TEXT_WHITE, 1, cv2.LINE_AA)
        else:
            cy += 22
            cv2.putText(canvas, "Waiting...", (inner_x + 4, cy),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, TEXT_DIM, 1, cv2.LINE_AA)

    # ------------------------------------------------------------------
    #  Feedback report screen
    # ------------------------------------------------------------------
    def _show_feedback_report(self, feedback: dict):
        """Draw a full-screen feedback report and wait for key press."""
        W, H = 820, 620
        img = np.full((H, W, 3), 30, dtype=np.uint8)
        img[:] = BG_DARK

        # Title bar
        cv2.rectangle(img, (0, 0), (W, 55), (20, 20, 25), -1)
        cv2.putText(img, "SESSION FEEDBACK REPORT", (20, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, ACCENT_CYAN, 2, cv2.LINE_AA)

        # Duration & stats
        dur = feedback.get("duration_seconds", 0)
        mins, secs = divmod(int(dur), 60)
        y = 85
        cv2.putText(img, f"Duration: {mins}m {secs}s   |   Frames analysed: {feedback.get('total_frames_analyzed', 0)}   |   "
                    f"Face visible: {feedback.get('face_presence_rate', 0):.0f}%",
                    (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.44, TEXT_DIM, 1, cv2.LINE_AA)

        # --- Metric cards ---
        metrics = [
            ("CONFIDENCE",   feedback.get("avg_confidence", 0),   False, feedback.get("confidence_feedback", "")),
            ("NERVOUSNESS",  feedback.get("avg_nervousness", 0),  True,  feedback.get("nervousness_feedback", "")),
            ("ENGAGEMENT",   feedback.get("avg_engagement", 0),   False, feedback.get("engagement_feedback", "")),
            ("EYE CONTACT",  feedback.get("avg_eye_contact", 0),  False, feedback.get("eye_contact_feedback", "")),
        ]

        card_x = 20
        card_w = W - 40
        bar_w = card_w - 180
        y = 110

        for title, score, invert, fb_text in metrics:
            card_h = 80
            draw_rounded_rect(img, (card_x, y), (card_x + card_w, y + card_h), BG_PANEL, fill=True, radius=10)
            draw_rounded_rect(img, (card_x, y), (card_x + card_w, y + card_h), BG_CARD, thickness=1, radius=10)

            cv2.putText(img, title, (card_x + 14, y + 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, ACCENT_CYAN, 1, cv2.LINE_AA)

            draw_progress_bar(img, card_x + 14, y + 32, bar_w, 14,
                              score, score_colour(score, invert=invert))

            # Wrap feedback text (simple single-line truncation)
            fb_display = fb_text[:90] + ("..." if len(fb_text) > 90 else "")
            cv2.putText(img, fb_display, (card_x + 14, y + 68),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.37, TEXT_DIM, 1, cv2.LINE_AA)

            y += card_h + 10

        # --- Overall score ---
        y += 10
        overall = feedback.get("overall_score", 0)
        overall_col = score_colour(overall)
        draw_rounded_rect(img, (card_x, y), (card_x + card_w, y + 70), BG_PANEL, fill=True, radius=10)
        draw_rounded_rect(img, (card_x, y), (card_x + card_w, y + 70), overall_col, thickness=2, radius=10)

        cv2.putText(img, "OVERALL SCORE", (card_x + 14, y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, TEXT_WHITE, 1, cv2.LINE_AA)
        cv2.putText(img, f"{overall:.0f} / 100", (card_x + 200, y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, overall_col, 2, cv2.LINE_AA)

        overall_fb = feedback.get("overall_feedback", "")
        cv2.putText(img, overall_fb, (card_x + 14, y + 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, TEXT_DIM, 1, cv2.LINE_AA)

        # --- Footer ---
        cv2.putText(img, "Press any key to close...", (W // 2 - 110, H - 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, TEXT_DIM, 1, cv2.LINE_AA)

        cv2.imshow("Session Feedback Report", img)
        cv2.waitKey(0)
        cv2.destroyWindow("Session Feedback Report")

    # ------------------------------------------------------------------
    #  Console feedback
    # ------------------------------------------------------------------
    @staticmethod
    def _print_feedback(fb: dict):
        print("\n" + "=" * 64)
        print("           SESSION FEEDBACK REPORT")
        print("=" * 64)
        dur = fb.get("duration_seconds", 0)
        m, s = divmod(int(dur), 60)
        print(f"  Duration            : {m}m {s}s")
        print(f"  Frames Analysed     : {fb.get('total_frames_analyzed', 0)}")
        print(f"  Face Presence Rate  : {fb.get('face_presence_rate', 0):.1f}%")
        print("-" * 64)
        for label, key, fb_key in [
            ("Confidence ", "avg_confidence",  "confidence_feedback"),
            ("Nervousness", "avg_nervousness", "nervousness_feedback"),
            ("Engagement ", "avg_engagement",  "engagement_feedback"),
            ("Eye Contact", "avg_eye_contact", "eye_contact_feedback"),
        ]:
            score = fb.get(key, 0)
            bar_len = int(score / 5)
            bar = "█" * bar_len + "░" * (20 - bar_len)
            print(f"  {label}  : [{bar}] {score:.1f}%")
            print(f"                  {fb.get(fb_key, '')}")
        print("-" * 64)
        overall = fb.get("overall_score", 0)
        bar_len = int(overall / 5)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        print(f"  OVERALL      : [{bar}] {overall:.1f} / 100")
        print(f"                  {fb.get('overall_feedback', '')}")
        print("=" * 64)

        # Emotion Distribution
        dist = fb.get("emotion_distribution", {})
        if dist:
            print("\n  Emotion Distribution:")
            total = sum(dist.values())
            for emo, cnt in sorted(dist.items(), key=lambda x: x[1], reverse=True):
                pct = (cnt / total) * 100 if total else 0
                print(f"    {emo:12s}: {cnt:3d}  ({pct:.1f}%)")
        print()

    # ------------------------------------------------------------------
    #  Main run loop
    # ------------------------------------------------------------------
    def run(self):
        cap = self._init_camera()

        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, self.canvas_w, self.canvas_h)

        logger.info("Starting analysis — press Q to quit and view your report")

        self._all_emotions: dict = {}

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    logger.error("Failed to grab frame")
                    break

                self._calc_fps()
                self.frame_counter += 1

                # --- Analyse on Nth frame ---
                if self.frame_counter % self.skip_frames == 0:
                    result = self.model.analyze_frame(frame)

                    self.eye_contact_score = result.get("eye_contact_score", 0.0)
                    self.is_face_present   = result.get("is_face_present", False)
                    self.interview_metrics = result.get("interview_metrics",
                                                        {"confidence": 0, "nervousness": 0, "engagement": 0})
                    self._all_emotions = result.get("all_emotions", {})

                    if result["success"]:
                        self.current_emotion    = result["emotion"]
                        self.current_confidence = result.get("facial_score",
                                                             result.get("confidence", 0.0))
                        self.face_coords        = result["face_coordinates"]
                    else:
                        if self.frame_counter > 100:
                            self.current_emotion    = "No Face"
                            self.current_confidence = 0.0
                            self.face_coords        = None

                # --- Smooth bar values ---
                self._update_smooth_values()

                # --- Build canvas ---
                canvas = np.full((self.canvas_h, self.canvas_w, 3), 30, dtype=np.uint8)
                canvas[:] = BG_DARK

                self._draw_top_bar(canvas)
                self._draw_webcam(canvas, frame)
                self._draw_metrics_panel(canvas)
                self._draw_bottom_bar(canvas)

                cv2.imshow(self.window_name, canvas)

                # --- Keyboard ---
                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), ord("Q")):
                    logger.info("Quit requested — generating feedback...")
                    break
                elif key in (ord("r"), ord("R")):
                    logger.info("Session reset")
                    self.model.reset_history()
                    self.start_time = time.time()
                    self.current_emotion = "Session Reset"
                elif key in (ord("s"), ord("S")):
                    stats = self.model.get_statistics()
                    print(stats)

        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
        finally:
            cap.release()
            cv2.destroyWindow(self.window_name)

            # --- Generate & display feedback ---
            feedback = self.model.get_session_feedback()
            if "error" not in feedback:
                self._print_feedback(feedback)
                self._show_feedback_report(feedback)
            else:
                print(f"\n⚠ {feedback['error']}")

            cv2.destroyAllWindows()
            logger.info("Application closed.")


# ======================================================================
#  Entry-point
# ======================================================================
def main():
    print("\n" + "=" * 64)
    print("   SMART MOCK INTERVIEW SYSTEM — FACIAL EXPRESSION ANALYSER")
    print("=" * 64 + "\n")
    try:
        gui = EmotionDetectionGUI(camera_id=0, skip_frames=5)
        gui.run()
    except Exception as e:
        logger.error(f"Fatal: {e}", exc_info=True)
        print("\n❌ Failed to start. See error above.")
        input("Press Enter to exit...")
        sys.exit(1)


if __name__ == "__main__":
    main()
