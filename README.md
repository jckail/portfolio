# Welcome to my Portfolio website

This repository contains the code for my personal website that serves as a hub for skills, projects, resume, and potentially a blog. The website is built using Python with Streamlit for the frontend and FastAPI for the backend.

## Project Overview

The project consists of two main components:

1. Frontend: A Streamlit application that displays the resume information in an interactive and visually appealing manner.
2. Backend: A FastAPI application that serves the resume data and provides endpoints for downloading the resume PDF.

The application is containerized using Docker, making it easy to deploy and run in various environments.

### Why FastAPI and Streamlit?

- **FastAPI** was chosen for its high performance, easy integration with other services, and built-in support for asynchronous programming. It allows for efficient handling of multiple requests and easy linking of various components to the personal website.

- **Streamlit** was selected as a challenge to explore a different approach to web development, moving away from traditional frameworks like React or Svelte. It offers rapid prototyping capabilities and seamless integration with Python-based backends, making it an excellent choice for this dynamic resume project.

## How It Works

1. The backend (FastAPI) serves the resume data through various endpoints:
   - `/resume`: Returns the full resume data
   - `/resume/{section}`: Returns specific sections of the resume
   - `/download_resume`: Allows downloading the resume PDF

2. The frontend (Streamlit) fetches data from the backend and displays it in a user-friendly interface:
   - It uses custom components and styling to create an attractive layout
   - Implements a dark/light mode toggle for user preference
   - Displays sections for Experience, Skills, and Achievements
   - Generates content dynamically at runtime, making the website highly adaptable and easy to update

3. The application uses environment variables (e.g., `API_URL`) to configure the connection between frontend and backend.

4. Docker is used to package both frontend and backend into a single container, simplifying deployment.

### Particles.js Integration

The frontend incorporates particles.js to create dynamic, interactive backgrounds, enhancing the visual appeal of the website. Special thanks to Vincent Garreau for creating this amazing library. You can find more about particles.js at https://vincentgarreau.com/particles.js/

## Local Development

To run the application locally, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set the API_URL environment variable:
   ```
   export API_URL=http://localhost:8000  # On Windows, use `set API_URL=http://localhost:8000`
   ```

5. Run the application using the entrypoint script:
   ```
   ./entrypoint.sh  # On Windows, you may need to use `sh entrypoint.sh` or run the commands in the script manually
   ```

6. Access the application:
   - The frontend will be available at `http://localhost:8080`
   - The backend will be available at `http://localhost:8000`

7. To stop the application, press `Ctrl+C` in the terminal where the entrypoint script is running.

## Deploying to Google Cloud Run (jckail.com)

To deploy this application to Google Cloud Run and make it accessible at jckail.com, follow these steps:

1. Set up a Google Cloud account and install the Google Cloud SDK.

2. Authenticate with Google Cloud:
   ```
   gcloud auth login
   ```

3. Set your project ID:
   ```
   gcloud config set project YOUR_PROJECT_ID
   ```

4. Build the Docker image:
   ```
   docker build -t gcr.io/YOUR_PROJECT_ID/resume-app .
   ```

5. Push the image to Google Container Registry:
   ```
   docker push gcr.io/YOUR_PROJECT_ID/resume-app
   ```

6. Deploy to Cloud Run:
   ```
   gcloud run deploy resume-app \
     --image gcr.io/YOUR_PROJECT_ID/resume-app \
     --platform managed \
     --region YOUR_PREFERRED_REGION \
     --allow-unauthenticated \
     --set-env-vars=API_URL=https://jckail.com
   ```

7. Set up domain mapping:
   ```
   gcloud run domain-mappings create --service resume-app --domain jckail.com
   ```

8. Configure your DNS:
   - Add an A record pointing to the IP address provided by Google Cloud Run
   - Add a CNAME record for www.jckail.com pointing to jckail.com

9. Wait for DNS propagation and SSL certificate provisioning (this may take up to 24 hours).

10. Access your deployed application at https://jckail.com

Remember to replace `YOUR_PROJECT_ID` and `YOUR_PREFERRED_REGION` with your actual Google Cloud project details.

## Upgrading the Project

To upgrade or extend the project:

1. Backend enhancements:
   - Add new endpoints in `resume_app/backend/main.py`
   - Update or extend the resume data in `resume_app/backend/resume_data.py`

2. Frontend improvements:
   - Modify the Streamlit app in `resume_app/frontend/streamlit_app.py`
   - Add or update components in `resume_app/frontend/components.py`
   - Adjust styles in `resume_app/frontend/styles.py`

3. Update dependencies:
   - Add new packages to `requirements.txt`
   - Update the Dockerfile if new system dependencies are required

## Modifying for Another Person

To adapt this project for another individual:

1. Update the resume data:
   - Modify `resume_app/backend/resume_data.py` with the new person's information
   - Replace the PDF resume in `resume_app/backend/assets/`

2. Customize the frontend:
   - Update any hardcoded names or personal information in `resume_app/frontend/streamlit_app.py`
   - Modify the styling in `resume_app/frontend/styles.py` to match the new person's preferences

3. Update metadata:
   - Change the page title and any other metadata in `resume_app/frontend/streamlit_app.py`

4. Update the domain name:
   - Replace jckail.com with the new domain name in the deployment instructions and environment variables

## Learn More

For more detailed information about the backend and frontend implementations, please refer to their respective README files:

- [Backend README](resume_app/backend/README.md)
- [Frontend README](resume_app/frontend/README.md)

These files contain in-depth explanations of the technologies used, features implemented, and the rationale behind certain design decisions.

By following these instructions, you can run the application locally for development and deploy it to Google Cloud Run at jckail.com. The application will automatically use the appropriate API URL based on the environment, allowing for seamless local development and cloud deployment.