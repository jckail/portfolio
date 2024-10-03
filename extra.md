# QuickResume -- to be used in a v1 release to share with other people.

QuickResume is a dynamic, interactive resume application built with FastAPI backend and Streamlit frontend. This project showcases a modern approach to creating and displaying a professional resume, leveraging the strengths of both frameworks to create a unique and engaging user experience.

## Project Structure

The project is divided into two main parts:

1. **Backend**: Built with FastAPI, located in `resume_app/backend/`
2. **Frontend**: Built with Streamlit, located in `resume_app/frontend/`

Each part has its own README.md with detailed information about the implementation, features, and reasons for choosing the respective frameworks.

## Key Features

- Dynamic content generation from backend API
- Interactive user interface with Streamlit
- Engaging visual elements with particles.js integration
- Scalable and performant backend with FastAPI
- Easy to adapt and customize for personal use

## Getting Started

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Start the backend:
   ```
   cd resume_app/backend
   uvicorn main:app --reload
   ```
4. In a new terminal, start the frontend:
   ```
   cd resume_app/frontend
   streamlit run streamlit_app.py
   ```

## Learn More

- [Backend README](resume_app/backend/README.md)
- [Frontend README](resume_app/frontend/README.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).