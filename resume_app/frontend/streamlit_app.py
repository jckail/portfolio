import streamlit as st
import requests
import streamlit.components.v1 as components

from styles import dark_mode_css, light_mode_css
from components import create_header, create_navigation, create_section, create_experience_item, create_skills_section, create_achievements_section
from particles import dark_mode_particles_js, light_mode_particles_js

# API URL for fetching resume data
API_URL = "http://127.0.0.1:8000"

# Set the page configuration
st.set_page_config(page_title="Jordan Kail's Resume", layout="wide")

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

# Custom CSS for the overall layout
custom_css = """
<style>
.content {
    margin-top: 20px;
}
.section-marker {
    margin-top: 20px;
    margin-bottom: 10px;
}
.header {
    padding-top: 20px;
}
</style>
"""

# Inject CSS based on the theme
if st.session_state['theme'] == 'dark':
    st.markdown(dark_mode_css, unsafe_allow_html=True)
    components.html(dark_mode_particles_js, height=0)
else:
    st.markdown(light_mode_css, unsafe_allow_html=True)
    components.html(light_mode_particles_js, height=0)

# Inject custom CSS
st.markdown(custom_css, unsafe_allow_html=True)

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
create_section("Achievements", create_achievements_section(resume_data['achievements']))

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)
