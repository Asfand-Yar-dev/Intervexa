# Smart Mock Interview System - GUI Application

## Overview

A professional GUI application for conducting mock interviews with both **Technical** and **Soft Skills** questions powered by Google's Gemini AI.

## Features

✅ **User Profile Input**
- Enter target job role
- Specify technical skills/tech stack
- Choose difficulty level (Easy/Medium/Hard)
- Customize number of questions

✅ **Dual Question Types**
- **Technical Questions**: Based on your tech stack and job role
- **Soft Skills Questions**: Behavioral and interpersonal skills assessment

✅ **Interactive Interview Flow**
- One question at a time
- Save and navigate between questions
- Track progress
- Review all answers at the end

✅ **Professional Interface**
- Clean, modern design
- Easy to navigate
- Loading indicators
- Progress tracking

## How to Use

### Step 1: Run the Application

```bash
python interview_gui.py
```

### Step 2: Enter Your Profile

1. **Target Job Role**: e.g., "Full Stack Developer", "Data Scientist"
2. **Technical Skills**: e.g., "Python, Django, React, PostgreSQL"
3. **Difficulty Level**: Choose Easy, Medium, or Hard
4. **Number of Questions**: Set how many technical and soft skills questions

### Step 3: Generate Questions

Click "Generate Interview Questions" and wait while AI creates personalized questions.

### Step 4: Answer Questions

- Read each question carefully
- Type your answer in the text box
- Click "Save Answer" to save your response
- Use "Next" and "Previous" to navigate
- Click "Finish Interview" when done

### Step 5: Review Results

See a summary of all questions and your answers.

## Question Types

### Technical Questions
- Framework and library specific
- Problem-solving scenarios
- Best practices and design patterns
- Performance optimization
- Architecture and system design

### Soft Skills Questions
- Leadership and teamwork
- Communication skills
- Problem-solving and adaptability
- Time management
- Professional development
- Ethics and integrity

## Screenshots

### Profile Input Screen
- Enter your information
- Customize interview settings

### Interview Screen
- Clear question display
- Easy answer input
- Navigation buttons

### Results Screen
- Complete interview summary
- Review all Q&A

## Technical Details

- **Framework**: Tkinter (Python's built-in GUI library)
- **AI Engine**: Google Gemini 2.5-Flash
- **Threading**: Background question generation
- **Responsive**: Clean, professional interface

## Keyboard Shortcuts

- **Tab**: Navigate between fields
- **Enter**: Submit (on buttons)
- **Scroll**: View long questions/answers

## Tips for Best Results

1. **Be Specific**: Provide detailed tech stack information
2. **Choose Appropriate Difficulty**: Match your experience level
3. **Balance Questions**: Mix technical and soft skills (default: 5 technical, 3 soft skills)
4. **Answer Thoroughly**: Provide complete answers for better practice
5. **Use STAR Method**: For behavioral questions (Situation, Task, Action, Result)

## Troubleshooting

### Application Won't Start
- Ensure all dependencies are installed: `pip install google-generativeai`
- Check that Python 3.8+ is installed

### Questions Not Generating
- Check your internet connection
- Verify API key is set correctly
- Wait a few seconds - generation takes time

### GUI Appears Frozen
- This is normal during question generation
- Wait for the loading screen to complete

## Future Enhancements

Possible additions:
- Voice input for answers
- Timer per question
- AI-powered feedback on answers
- Export interview results to PDF
- Save/load interview sessions
- Multiple interview templates

## System Requirements

- Python 3.8 or higher
- Internet connection (for AI question generation)
- Windows/Mac/Linux compatible
- Display: 900x700 minimum resolution

## License

Part of the Smart Mock Interview System project.

---

**Enjoy your mock interview practice!** 🎯
