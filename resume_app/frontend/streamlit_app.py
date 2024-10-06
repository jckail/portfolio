import streamlit as st
import requests
import streamlit.components.v1 as components
import os

from styles import get_styles_css
from components import create_header, create_section, create_experience_item, create_skills_section, create_projects_section
from particles import get_particle_js
from configs import particle_config,styles_config

# API URL for fetching resume data
API_URL = os.environ.get("API_URL", "http://localhost:8000")

# Set the page configuration
st.set_page_config(page_title="Jordan Kail's Portfolio", layout="wide",initial_sidebar_state="collapsed")

# Initialize session state for theme
if 'theme' not in st.session_state:
    st.session_state['theme'] = 'dark'

# Function to toggle theme
def toggle_theme():
    st.session_state['theme'] = 'light' if st.session_state['theme'] == 'dark' else 'dark'
    

# Function to fetch resume data
def fetch_resume_data():
    response = requests.get(f"{API_URL}/resume")
    return response.json()

# Call the function to fetch resume data
resume_data = fetch_resume_data()


# Inject CSS based on the theme
st.markdown(get_styles_css(st.session_state['theme'],styles_config), unsafe_allow_html=True)
components.html(get_particle_js(st.session_state['theme'],particle_config), height=0)

# Create header with theme toggle
theme_icon = '🌙' if st.session_state['theme'] == 'dark' else '☀️'
create_header(resume_data['name'], resume_data['contact'], theme_icon, st.session_state['theme'] == 'dark', toggle_theme)

# Display the resume content
st.markdown('<div class="content">', unsafe_allow_html=True)

# Experience Section
create_section("Experience", "".join(create_experience_item(job) for job in resume_data['experience']))

# Skills Section
create_section("Skills", create_skills_section(resume_data['skills']))

# Achievements Section
create_section("Projects", create_projects_section(resume_data['projects']))

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)

