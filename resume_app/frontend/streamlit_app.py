import streamlit as st
import requests
import streamlit.components.v1 as components
from styles import css
from components import create_header, create_navigation, create_section, create_experience_item, create_skills_section, create_achievements_section
from utils import add_script_for_download_and_navigation
from particles import particles_js

# API URL for fetching resume data
API_URL = "http://localhost:8000"

# Set the page configuration
st.set_page_config(page_title="Jordan Kail's Resume", layout="wide")

# Function to fetch resume data
def fetch_resume_data():
    response = requests.get(f"{API_URL}/resume")
    return response.json()

# Call the function to fetch resume data
resume_data = fetch_resume_data()

# Inject CSS
st.markdown(css, unsafe_allow_html=True)

# Inject particles background
components.html(particles_js, height=0)

# Create header
create_header(resume_data['name'], resume_data['contact'])

# Create navigation in sidebar
with st.sidebar:
    with st.expander("Navigation", expanded=False):
        create_navigation()

# Display the resume content
st.markdown("<div class='content'>", unsafe_allow_html=True)

# Experience Section
create_section("Experience", "".join(create_experience_item(job) for job in resume_data['experience']))

# Skills Section
create_section("Skills", create_skills_section(resume_data['skills']))

# Achievements Section
create_section("Achievements", create_achievements_section(resume_data['achievements']))

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)

# Add JavaScript for smooth scrolling, navigation, and resume download
st.markdown(add_script_for_download_and_navigation(), unsafe_allow_html=True)
