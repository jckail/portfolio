import streamlit as st
import requests
import streamlit.components.v1 as components
import os

from styles import get_styles_css
from custom_components import create_header, create_section, create_experience_item, create_skills_section, create_projects_section
from particles import get_particle_js
from configs import particle_config, styles_config

# API URL for fetching resume data
API_URL = os.environ.get("API_URL", "http://localhost:8000")

# Set the page configuration
st.set_page_config(
    page_title="Jordan Kail",
    page_icon="images/favicon.ico",
    layout="wide",
    initial_sidebar_state="collapsed",
    menu_items={
        'Get Help': 'https://github.com/jckail/portfolio',
        'Report a bug': "https://github.com/jckail/portfolio/issues",
        'About': "# Jordan Kail\n This Streamlit app showcases Jordan Kail's professional experience, skills, and projects."
    }
)

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
st.markdown(get_styles_css(st.session_state['theme'], styles_config), unsafe_allow_html=True)
components.html(get_particle_js(st.session_state['theme'], particle_config), height=0)

# Create header with theme toggle
theme_icon = '🌙' if st.session_state['theme'] == 'dark' else '☀️'
create_header(resume_data['name'], resume_data['contact'], theme_icon, st.session_state['theme'] == 'dark', toggle_theme, API_URL)

# Display the resume content
st.markdown('<div class="content">', unsafe_allow_html=True)

# Experience Section
create_section("Experience", "".join(create_experience_item(job) for job in resume_data['experience']))

# Skills Section
create_section("Technical Skills", create_skills_section(resume_data['skills']))

# Projects Section
create_section("Projects", create_projects_section(resume_data['projects']))

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)

# Google Tag Manager Script
gtag_script = '''
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HDKC74P3BD"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-HDKC74P3BD');
</script>
'''
components.html(gtag_script, height=0)

# Add metadata
st.markdown('''
    <meta name="description" content="Jordan Kail's professional portfolio showcasing experience, skills, and projects.">
    <meta name="keywords" content="Jordan Kail, Portfolio, Resume, Skills, Projects, Software Engineer, Data Engineer">
    <meta name="author" content="Jordan Kail">
    <link rel="canonical" href="https://jordankail.com">
''', unsafe_allow_html=True)

# Add Open Graph and Twitter Card metadata
st.markdown('''
    <meta property="og:title" content="Jordan Kail | Portfolio">
    <meta property="og:description" content="Professional portfolio showcasing Jordan Kail's experience, skills, and projects.">
    <meta property="og:image" content="https://jordankail.com/images/avatar.jpeg">
    <meta property="og:url" content="https://jordankail.com">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Jordan Kail | Portfolio">
    <meta name="twitter:description" content="Professional portfolio showcasing Jordan Kail's experience, skills, and projects.">
    <meta name="twitter:image" content="https://jordankail.com/images/avatar.jpeg">
''', unsafe_allow_html=True)
