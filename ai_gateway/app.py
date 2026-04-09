"""
Unified AI Gateway for Intervexa — Smart Mock Interview System
================================================================

This Flask application serves as the single entry point for ALL AI models
in the system. The Node.js backend communicates with this gateway instead
of each model individually.

Endpoints:
    GET  /api/ai/health                 – Health check for all services
    POST /api/ai/transcribe             – Speech-to-Text (Whisper)
    POST /api/ai/analyze-nlp            – NLP answer evaluation (Sentence-BERT)
    POST /api/ai/analyze-voice          – Vocal characteristics analysis (Wav2Vec2)
    POST /api/ai/analyze-face           – Facial expression analysis (DeepFace)
    POST /api/ai/fuse-scores            – Combine voice + face into behavioral score
    POST /api/ai/generate-questions     – Generate interview questions (Gemini)
    POST /api/ai/generate-feedback      – Generate answer feedback (Gemini)

Run:
    python app.py
    # or: gunicorn -w 1 -b 0.0.0.0:8000 app:app

Author: Intervexa Team
"""

import os
import sys
import logging
import tempfile
import time
import importlib.util
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Setup paths so we can import from sibling AI model directories
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "Answer_Generation"))
sys.path.insert(0, str(PROJECT_ROOT / "NLP_Evaluation"))
sys.path.insert(0, str(PROJECT_ROOT / "STT_Model"))
sys.path.insert(0, str(PROJECT_ROOT / "Voice_Model"))
sys.path.insert(0, str(PROJECT_ROOT / "Facial_Model" / "quantum-cluster"))
sys.path.insert(0, str(PROJECT_ROOT / "Fusion Model"))

# Load environment variables from project root .env
env_path = PROJECT_ROOT / "backend" / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Also load a local ai_gateway/.env if present
local_env = Path(__file__).resolve().parent / ".env"
if local_env.exists():
    load_dotenv(dotenv_path=local_env, override=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_gateway")

# ---------------------------------------------------------------------------
# Allowed audio extensions
# ---------------------------------------------------------------------------
ALLOWED_AUDIO_EXT = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}
UPLOAD_DIR = Path(tempfile.gettempdir()) / "ai_gateway_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Lazy-load AI models (loaded on first request to save startup time)
# ---------------------------------------------------------------------------
_models = {}

def _reset_ai_engine_imports():
    """Clear cached ai_engine modules so imports resolve from the intended folder."""
    for mod_name in list(sys.modules.keys()):
        if mod_name == "ai_engine" or mod_name.startswith("ai_engine."):
            sys.modules.pop(mod_name, None)

def _load_symbol_from_file(module_name: str, file_path: Path, symbol_name: str):
    """Load a symbol from a Python file using a unique module namespace."""
    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module spec for: {file_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, symbol_name):
        raise ImportError(f"Symbol '{symbol_name}' not found in {file_path}")
    return getattr(module, symbol_name)


def _get_interviewer():
    """Answer Generation — Gemini-based question & feedback generator."""
    if "interviewer" not in _models:
        try:
            # There are multiple folders in this repo that contain an `ai_engine/` package.
            # We MUST prioritize the Answer_Generation folder so that
            # `ai_engine.interviewer` resolves to Answer_Generation/ai_engine/interviewer.py.
            answer_gen_dir = PROJECT_ROOT / "Answer_Generation"
            answer_gen_path = str(answer_gen_dir)
            if answer_gen_path in sys.path:
                sys.path.remove(answer_gen_path)
            sys.path.insert(0, answer_gen_path)
            _reset_ai_engine_imports()
            InterviewConductor = _load_symbol_from_file(
                "answer_generation_interviewer",
                answer_gen_dir / "ai_engine" / "interviewer.py",
                "InterviewConductor",
            )
            api_key = os.getenv("GEMINI_API_KEY")
            _models["interviewer"] = InterviewConductor(api_key=api_key)
            logger.info("✅ InterviewConductor (Gemini) loaded")
        except Exception as e:
            logger.error(f" Failed to load InterviewConductor: {e}")
            _models["interviewer"] = None
    return _models["interviewer"]


def _get_nlp_analyzer():
    """Disabled locally due to Windows meta-tensor bug. Using AI Conductor instead."""
    return None


def _get_stt_engine():
    """Speech-to-Text — Whisper model."""
    if "stt" not in _models:
        try:
            stt_dir = str(PROJECT_ROOT / "STT_Model")
            if stt_dir in sys.path:
                sys.path.remove(stt_dir)
            sys.path.insert(0, stt_dir)
            from ai_models.stt_engine import STTEngine
            # Use 'base' for faster startup; switch to 'medium' for better accuracy
            model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
            _models["stt"] = STTEngine.get_instance(model_size=model_size)
            logger.info(f"✅ STTEngine (Whisper {model_size}) loaded")
        except Exception as e:
            logger.error(f" Failed to load STTEngine: {e}")
            _models["stt"] = None
    return _models["stt"]


def _get_vocal_analyzer():
    """Vocal Characteristics — Wav2Vec2 + librosa."""
    if "vocal" not in _models:
        try:
            voice_dir = PROJECT_ROOT / "Voice_Model"
            voice_path = str(voice_dir)
            if voice_path in sys.path:
                sys.path.remove(voice_path)
            sys.path.insert(0, voice_path)
            _reset_ai_engine_imports()
            VocalToneAnalyzer = _load_symbol_from_file(
                "voice_model_analysis",
                voice_dir / "ai_engine" / "vocal_analysis.py",
                "VocalToneAnalyzer",
            )
            _models["vocal"] = VocalToneAnalyzer()
            logger.info("✅ VocalToneAnalyzer (Wav2Vec2) loaded")
        except Exception as e:
            logger.error(f" Failed to load VocalToneAnalyzer: {e}")
            _models["vocal"] = None
    return _models["vocal"]


def _get_facial_model():
    """Facial Expression — DeepFace + OpenCV."""
    if "facial" not in _models:
        try:
            from models.Facial_AI_Module import FacialExpressionModel
            _models["facial"] = FacialExpressionModel()
            logger.info("✅ FacialExpressionModel (DeepFace) loaded")
        except Exception as e:
            logger.error(f"Failed to load FacialExpressionModel: {e}")
            _models["facial"] = None
    return _models["facial"]


def _get_fusion_engine():
    """Fusion Engine — combines voice + face scores."""
    if "fusion" not in _models:
        try:
            fusion_dir = PROJECT_ROOT / "Fusion Model"
            fusion_path = str(fusion_dir)
            if fusion_path in sys.path:
                sys.path.remove(fusion_path)
            sys.path.insert(0, fusion_path)
            _reset_ai_engine_imports()
            FusionEngine = _load_symbol_from_file(
                "fusion_model_engine",
                fusion_dir / "ai_engine" / "fusion_engine.py",
                "FusionEngine",
            )
            _models["fusion"] = FusionEngine()
            logger.info("✅ FusionEngine loaded")
        except Exception as e:
            logger.error(f" Failed to load FusionEngine: {e}")
            _models["fusion"] = None
    return _models["fusion"]


# ---------------------------------------------------------------------------
# Flask App
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB


# ===========================================================================
# HEALTH CHECK
# ===========================================================================
@app.route("/api/ai/health", methods=["GET"])
def health():
    """Return status of all AI services."""
    return jsonify({
        "status": "ok",
        "services": {
            "answer_generation": "interviewer" in _models and _models["interviewer"] is not None,
            "nlp_evaluation": "nlp" in _models and _models["nlp"] is not None,
            "speech_to_text": "stt" in _models and _models["stt"] is not None,
            "vocal_analysis": "vocal" in _models and _models["vocal"] is not None,
            "facial_analysis": "facial" in _models and _models["facial"] is not None,
            "fusion_engine": "fusion" in _models and _models["fusion"] is not None,
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }), 200


@app.route("/health", methods=["GET"])
def health_simple():
    """Simple health check for circuit breaker."""
    return jsonify({"status": "ok"}), 200


# ===========================================================================
# 1. SPEECH-TO-TEXT (Whisper)
# ===========================================================================
@app.route("/api/ai/transcribe", methods=["POST"])
def transcribe():
    """Transcribe audio file to text using Whisper.

    Request:
        - multipart/form-data with 'audio' file field
        - Optional 'language' field: 'en' or 'ur'

    Response:
        { "status": "success", "text": "...", "language": "en", ... }
    """
    engine = _get_stt_engine()
    if engine is None:
        return jsonify({"status": "error", "message": "STT engine not available"}), 503

    if "audio" not in request.files:
        return jsonify({"status": "error", "message": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    if not audio_file.filename:
        return jsonify({"status": "error", "message": "No file selected"}), 400

    ext = Path(audio_file.filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXT:
        return jsonify({"status": "error", "message": f"Unsupported format: {ext}"}), 400

    language = request.form.get("language", None)

    try:
        audio_bytes = audio_file.read()
        result = engine.transcribe_bytes(
            audio_bytes=audio_bytes,
            language=language,
            filename=audio_file.filename,
        )
        status_code = 200 if result.get("status") == "success" else 422
        return jsonify(result), status_code
    except Exception as e:
        logger.exception("Transcription error")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===========================================================================
# 2. NLP ANALYSIS (Sentence-BERT)
# ===========================================================================
@app.route("/api/ai/analyze-nlp", methods=["POST"])
def analyze_nlp():
    """Evaluate user answer against a reference answer.

    Request JSON:
        { "user_answer": "...", "reference_answer": "..." }

    Response:
        { "score": 78.5, "feedback": "Good answer...", "status": "success" }
    """
    analyzer = _get_nlp_analyzer()
    conductor = _get_interviewer()
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "JSON body required"}), 400

    user_answer = data.get("user_answer", "")
    reference_answer = data.get("reference_answer", "")
    question_text = data.get("question_text", "")

    try:
        # Priority 1: High-Fidelity LLM Evaluation
        if conductor:
            score = conductor.evaluate_technical_score(question_text, user_answer, reference_answer or "")
            return jsonify({
                "status": "success",
                "score": score,
                "feedback": "Semantic evaluation performed via Intelligent AI reasoning."
            }), 200
            
        # Priority 2: Traditional BERT Similarity
        elif analyzer:
            score, feedback = analyzer.evaluate_answer(user_answer, reference_answer, question_text)
            return jsonify({
                "status": "success",
                "score": score,
                "feedback": feedback,
            }), 200
            
        # Fallback
        elif reference_answer:
            return jsonify({
                "status": "success",
                "score": 75.0,
                "feedback": "Standard fallback score applied.",
            }), 200
        else:
             return jsonify({"status": "error", "message": "AI scoring services are currently unavailable."}), 503
    except Exception as e:
        logger.exception("NLP analysis error")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===========================================================================
# 3. VOCAL ANALYSIS (Wav2Vec2 + librosa)
# ===========================================================================
@app.route("/api/ai/analyze-voice", methods=["POST"])
def analyze_voice():
    """Analyze vocal characteristics from audio.

    Request:
        - multipart/form-data with 'audio' file field
        - Optional 'quick' field: 'true' for signal-only analysis

    Response:
        { "status": "success", "overall_score": 72.5, ... }
    """
    analyzer = _get_vocal_analyzer()
    if analyzer is None:
        return jsonify({"status": "error", "message": "Voice analyzer not available"}), 503

    if "audio" not in request.files:
        return jsonify({"status": "error", "message": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    quick = request.form.get("quick", "false").lower() == "true"

    # Save to temp file
    ext = Path(audio_file.filename or "upload.wav").suffix or ".wav"
    temp_path = str(UPLOAD_DIR / f"voice_{int(time.time() * 1000)}{ext}")

    try:
        audio_file.save(temp_path)

        if quick:
            result = analyzer.analyze_tone_quick(temp_path)
        else:
            result = analyzer.analyze_tone(temp_path)

        result["status"] = "success"
        return jsonify(result), 200
    except FileNotFoundError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        logger.exception("Voice analysis error")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_path)
        except OSError:
            pass


# ===========================================================================
# 4. FACIAL ANALYSIS (DeepFace)
# ===========================================================================
@app.route("/api/ai/analyze-face", methods=["POST"])
def analyze_face():
    """Analyze facial expressions from video frames.

    Request:
        - multipart/form-data with 'video' file field (video or image)

    Response:
        { "status": "success", "overall_score": 75, "session_feedback": {...} }
    """
    model = _get_facial_model()
    if model is None:
        return jsonify({"status": "error", "message": "Facial model not available"}), 503

    if "video" not in request.files:
        return jsonify({"status": "error", "message": "No video file provided"}), 400

    video_file = request.files["video"]
    ext = Path(video_file.filename or "upload.webm").suffix or ".webm"
    temp_path = str(UPLOAD_DIR / f"face_{int(time.time() * 1000)}{ext}")

    try:
        import cv2
        video_file.save(temp_path)

        # Reset session for fresh analysis
        model.reset_history()

        # Open video and analyze frames
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            return jsonify({"status": "error", "message": "Cannot open video file"}), 400

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_interval = max(1, int(fps / 3))  # Analyze ~3 frames per second
        frame_count = 0
        analyzed_count = 0
        first_frame_analyzed = False

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            # Always attempt first frame; then sample by interval.
            if (not first_frame_analyzed) or (frame_count % frame_interval == 0):
                model.analyze_frame(frame)
                analyzed_count += 1
                first_frame_analyzed = True

        cap.release()

        if analyzed_count == 0:
            return jsonify({"status": "error", "message": "No frames could be analyzed"}), 422

        # Get session-level summary
        feedback = model.get_session_feedback()
        feedback["status"] = "success"
        feedback["frames_analyzed"] = analyzed_count

        return jsonify(feedback), 200

    except Exception as e:
        logger.exception("Facial analysis error")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass


# ===========================================================================
# 5. FUSION ENGINE
# ===========================================================================
@app.route("/api/ai/fuse-scores", methods=["POST"])
def fuse_scores():
    """Combine voice and facial scores into a behavioral score.

    Request JSON:
        {
            "voice_data": { "score": 75, "emotion": "Confident" },
            "face_data":  { "score": 70, "emotion": "Neutral" }
        }

    Response:
        { "status": "success", "final_score": 73, "label": "Good", ... }
    """
    engine = _get_fusion_engine()
    if engine is None:
        return jsonify({"status": "error", "message": "Fusion engine not available"}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "JSON body required"}), 400

    try:
        result = engine.fuse_scores(
            voice_data=data.get("voice_data"),
            face_data=data.get("face_data"),
        )
        result["status"] = "success"
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Fusion error")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===========================================================================
# 6. QUESTION GENERATION (Gemini)
# ===========================================================================
@app.route("/api/ai/generate-questions", methods=["POST"])
def generate_questions():
    """Generate interview questions using Gemini AI.

    Request JSON:
        {
            "job_role": "Full Stack Developer",
            "tech_stack": "React, Node.js, MongoDB",
            "difficulty": "Medium",
            "include_soft_skills": true,
            "num_soft_skills": 2
        }

    Response:
        { "status": "success", "questions": [...], "soft_skills_questions": [...] }
    """
    conductor = _get_interviewer()
    if conductor is None:
        return jsonify({"status": "error", "message": "Interviewer AI not available"}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "JSON body required"}), 400

    job_role = data.get("job_role", "Software Developer")
    tech_stack = data.get("tech_stack", "")
    difficulty = data.get("difficulty", "Medium")
    include_soft = data.get("include_soft_skills", False)
    num_soft = data.get("num_soft_skills", 2)

    try:
        questions = conductor.generate_questions(job_role, tech_stack, difficulty)

        result = {
            "status": "success",
            "questions": questions,
        }

        if include_soft:
            soft_questions = conductor.generate_soft_skills_questions(job_role, num_soft)
            result["soft_skills_questions"] = soft_questions

        return jsonify(result), 200
    except Exception as e:
        logger.exception("Question generation error")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===========================================================================
# 7. ANSWER FEEDBACK (Gemini)
# ===========================================================================
@app.route("/api/ai/generate-feedback", methods=["POST"])
def generate_feedback():
    """Generate AI feedback for a user's answer.

    Request JSON:
        { "question": "...", "user_answer": "..." }

    Response:
        { "status": "success", "feedback": "..." }
    """
    conductor = _get_interviewer()
    if conductor is None:
        return jsonify({"status": "error", "message": "Interviewer AI not available"}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "JSON body required"}), 400

    question = data.get("question", "")
    user_answer = data.get("user_answer", "")

    if not question or not user_answer:
        return jsonify({"status": "error", "message": "question and user_answer required"}), 400

    try:
        feedback = conductor.generate_feedback(question, user_answer)
        return jsonify({
            "status": "success",
            "feedback": feedback,
        }), 200
    except Exception as e:
        logger.exception("Feedback generation error")
        return jsonify({"status": "error", "message": str(e)}), 500


# ===========================================================================
# 8. COMPREHENSIVE ANSWER ANALYSIS (All-in-One)
# ===========================================================================
@app.route("/api/ai/analyze-answer", methods=["POST"])
def analyze_answer_comprehensive():
    """Perform comprehensive analysis on an interview answer.

    This endpoint combines STT + NLP + Voice analysis in a single call.
    The Node.js backend can call this instead of making 3 separate calls.

    Request:
        - multipart/form-data with 'audio' file field
        - 'question_text': The interview question asked
        - 'reference_answer' (optional): Expected answer for NLP comparison

    Response:
        {
            "status": "success",
            "transcription": "...",
            "nlp_score": 78.5,
            "nlp_feedback": "...",
            "voice_score": 72.3,
            "voice_analysis": {...},
            "gemini_feedback": "...",
            "overall_score": 75
        }
    """
    if "audio" not in request.files:
        return jsonify({"status": "error", "message": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    question_text = request.form.get("question_text", "")
    reference_answer = request.form.get("reference_answer", "")

    ext = Path(audio_file.filename or "upload.wav").suffix or ".wav"
    temp_path = str(UPLOAD_DIR / f"comprehensive_{int(time.time() * 1000)}{ext}")

    try:
        audio_file.save(temp_path)

        result = {
            "status": "success",
            "transcription": "",
            "nlp_score": 0,
            "nlp_feedback": "",
            "voice_score": 0,
            "voice_analysis": {},
            "gemini_feedback": "",
            "overall_score": 0,
        }

        # Step 1: Transcribe audio
        stt = _get_stt_engine()
        if stt:
            stt_result = stt.transcribe_audio(temp_path)
            if stt_result.get("status") == "success":
                result["transcription"] = stt_result.get("text", "")

        # Step 2: NLP Analysis (High-Fidelity AI Evaluation)
        transcript = result["transcription"]
        if transcript:
            conductor = _get_interviewer()
            nlp = _get_nlp_analyzer()
            
            # Prefer LLM-based scoring for better "Ghor se" checking
            if conductor:
                try:
                    logger.info(f"Evaluating technical score for transcript of length {len(transcript)}")
                    score = conductor.evaluate_technical_score(question_text, transcript, reference_answer or "")
                    result["nlp_score"] = score
                    result["nlp_feedback"] = f"AI Analysis Score: {score}"
                    logger.info(f"LLM Scoring complete: {score}")
                except Exception as eval_err:
                    logger.error(f"LLM scoring failed, falling back: {eval_err}")
                    result["nlp_score"] = 75.0 if reference_answer else 0
            # Fallback to Sentence-BERT if LLM scoring is somehow disabled
            elif nlp and reference_answer:
                score, feedback = nlp.evaluate_answer(transcript, reference_answer, question_text)
                result["nlp_score"] = score
                result["nlp_feedback"] = feedback
            elif reference_answer:
                result["nlp_score"] = 75.0
                result["nlp_feedback"] = "Basic technical score applied (AI Analyzer bypass)."

        # Step 3: Voice Analysis
        vocal = _get_vocal_analyzer()
        if vocal:
            try:
                voice_result = vocal.analyze_tone_quick(temp_path)
                result["voice_score"] = voice_result.get("overall_score", 0)
                result["voice_analysis"] = voice_result
            except Exception as ve:
                logger.warning(f"Voice analysis failed: {ve}")

        # Step 4: Gemini Feedback (if we have question and transcription)
        if transcript and question_text:
            conductor = _get_interviewer()
            if conductor:
                try:
                    gemini_fb = conductor.generate_feedback(question_text, transcript)
                    result["gemini_feedback"] = gemini_fb
                except Exception as ge:
                    logger.warning(f"Gemini feedback failed: {ge}")

        # Calculate overall score (weighted average of available scores)
        scores = []
        if result["nlp_score"] > 0:
            scores.append(("nlp", result["nlp_score"], 0.5))
        if result["voice_score"] > 0:
            scores.append(("voice", result["voice_score"], 0.5))

        if scores:
            total_weight = sum(w for _, _, w in scores)
            result["overall_score"] = round(
                sum(s * w for _, s, w in scores) / total_weight, 1
            )

        return jsonify(result), 200

    except Exception as e:
        logger.exception("Comprehensive analysis error")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass


# ===========================================================================
# ENTRY POINT
# ===========================================================================
if __name__ == "__main__":
    port = int(os.environ.get("AI_GATEWAY_PORT", 8000))

    print(f"\n{'=' * 60}")
    print(f"  Intervexa AI Gateway")
    print(f"  Running on http://127.0.0.1:{port}")
    print(f"  Health: http://127.0.0.1:{port}/api/ai/health")
    print(f"{'=' * 60}\n")

    app.run(host="0.0.0.0", port=port, debug=False)
