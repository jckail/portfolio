# Frontend for QuickResume

This frontend is built using Streamlit, an open-source app framework for Machine Learning and Data Science projects.

## Why Streamlit?

Streamlit was chosen for this project for several reasons:

1. **Challenge and Learning**: Instead of using familiar frameworks like React or Svelte, I wanted to challenge myself with a new technology. Streamlit provided an opportunity to explore a different approach to web development.

2. **Rapid Prototyping**: Streamlit allows for quick development of data-centric web applications, which is perfect for a dynamic resume project.

3. **Python-based**: As the backend is in Python (FastAPI), using a Python-based frontend framework ensures a cohesive tech stack.

4. **Dynamic Content Generation**: Streamlit's ability to generate content at runtime aligns well with the goal of creating a dynamic, data-driven resume.

5. **Integration with Data Science Tools**: While not heavily used in this project, Streamlit's seamless integration with data visualization libraries could be beneficial for future enhancements.

## Features

1. **Dynamic Content**: The frontend dynamically generates content by calling the backend API at runtime, making the website highly adaptable and easy to update.

2. **Interactive Elements**: Utilizes Streamlit's interactive widgets to create an engaging user experience.

3. **Responsive Design**: Ensures a good user experience across different devices and screen sizes.

4. **Custom Styling**: Implements custom CSS to override Streamlit's default styles, creating a unique look and feel.

5. **Dynamic Backgrounds**: Incorporates particles.js for an engaging, interactive background.

## particles.js Integration

This project uses particles.js to create dynamic, interactive backgrounds. 

**Important Note**: particles.js is not my work. It was created by Vincent Garreau. 

Special thanks to Vincent Garreau for creating this amazing library. You can find more about particles.js at https://vincentgarreau.com/particles.js/

The integration of particles.js with Streamlit was a unique challenge, as Streamlit doesn't natively support such JavaScript libraries. The solution involved creative use of Streamlit's components and HTML injection capabilities.

## Template for Others

This frontend serves as an excellent template for others looking to create dynamic, data-driven web applications with Streamlit. Key aspects that make it adaptable:

1. **Separation of Concerns**: The frontend is structured with separate files for components, styles, and utilities, making it easy to modify specific parts of the application.

2. **API Integration**: Demonstrates how to fetch and display data from a backend API, which can be easily modified to work with different data sources.

3. **Custom Styling**: Shows how to apply custom styles to Streamlit applications, allowing for easy branding and design changes.

4. **Interactive Elements**: Provides examples of how to create interactive elements in Streamlit, which can be adapted for various use cases.

5. **Dynamic Content Generation**: The runtime generation of content from the backend makes it easy to adapt the application for different resumes or datasets.

## Getting Started

To run the frontend:

1. Install dependencies: `pip install -r requirements.txt`
2. Navigate to the frontend directory: `cd resume_app/frontend`
3. Run the Streamlit app: `streamlit run streamlit_app.py`

The application will open in your default web browser. Make sure the backend server is running to fetch the resume data.