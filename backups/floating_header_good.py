import streamlit as st
import requests
from streamlit_javascript import st_javascript

# API URL for fetching resume data
API_URL = "http://localhost:8000"

# Set the page configuration and theme
st.set_page_config(
    page_title="Jordan Kail's Portfolio",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Function to fetch resume data
def fetch_resume_data():
    response = requests.get(f"{API_URL}/resume")
    return response.json()

# Call the function to fetch resume data
resume_data = fetch_resume_data()

# Define custom theme and inject CSS
st.markdown(
    f"""
    <!-- Load Google Font -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap" rel="stylesheet">
    <style>
    /* General settings */
    .stApp {{
        background-color: #000000;
    }}
    html, body, [class*="css"]  {{
        font-family: 'Roboto', sans-serif;
        font-weight: 700;
        background-color: transparent;
        color: #FFFFFF;
    }}
    /* Adjust the top padding to prevent overlap with the fixed header */
    .content {{
        padding-top: 180px; /* Adjust this based on header height */
    }}
    /* Remove Streamlit's default header and footer */
    header, footer {{visibility: hidden;}}
    /* Header styling */
    .header {{
        position: fixed;
        top: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        padding: 10px 0;
        color: #FFFFFF;
        text-align: center;
    }}
    /* Navigation menu in header */
    .nav-menu {{
        display: flex;
        justify-content: center;
        margin-top: 10px;
    }}
    .nav-menu a {{
        color: #FFFFFF;
        margin: 0 15px;
        text-decoration: none;
        font-size: 18px;
    }}
    .nav-menu a:hover {{
        text-decoration: underline;
    }}
    /* Style for experience sections */
    .experience-section {{
        border-bottom: 1px solid #FFFFFF;
        padding-bottom: 20px;
        margin-bottom: 20px;
    }}
    </style>
    """,
    unsafe_allow_html=True
)

# Inject the particles.js script into the main page
st_javascript("""
    // Load particles.js library
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js';
    script.onload = () => {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 90,
                    "density": {
                        "enable": true,
                        "value_area": 900
                    }
                },
                "color": {
                    "value": ["#ffffff","#00ff3c","#ffffff","#00ff3c","#ffffff"]
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#ffffff"
                    }
                },
                "opacity": {
                    "value": 0.521,
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 5,
                    "random": true,
                    "anim": {
                        "enable": true,
                        "speed": 0.01,
                        "size_min": 0.1,
                        "sync": true
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 200,
                    "color": "#00ff3c",
                    "opacity": 0.7,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 0.3,
                    "direction": "none",
                    "random": true,
                    "straight": false,
                    "out_mode": "bounce",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "window",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    },
                    "onclick": {
                        "enable": false,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 400,
                        "line_linked": {
                            "opacity": 1
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 200,
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    };
    document.head.appendChild(script);

    // Create the particles-js div
    const particlesDiv = document.createElement('div');
    particlesDiv.id = 'particles-js';
    particlesDiv.style.position = 'fixed';
    particlesDiv.style.top = '0';
    particlesDiv.style.left = '0';
    particlesDiv.style.width = '100%';
    particlesDiv.style.height = '100%';
    particlesDiv.style.zIndex = '-1';
    document.body.prepend(particlesDiv);
""")

# Create the fixed header with contact info and navigation menu
st.markdown(f"""
    <div class='header'>
        <h1>{resume_data['name']}</h1>
        <p>
            📞 {resume_data['contact']['phone']} |
            📧 <a href="mailto:{resume_data['contact']['email']}" style="color:#FFFFFF;">{resume_data['contact']['email']}</a> |
            📍 {resume_data['contact']['location']} |
            🔗 <a href="{resume_data['contact']['github']}" style="color:#FFFFFF;">GitHub</a>
        </p>
        <div class='nav-menu'>
            <a href='#' class='nav-link' data-target='experience'>Experience</a>
            <a href='#' class='nav-link' data-target='skills'>Skills</a>
            <a href='#' class='nav-link' data-target='achievements'>Achievements</a>
        </div>
    </div>
""", unsafe_allow_html=True)

# Inject JavaScript to handle smooth scrolling
st_javascript("""
    // Add event listeners to navigation links
    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = this.getAttribute('data-target');
            var targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
""")

# Display the resume content
st.markdown("<div class='content'>", unsafe_allow_html=True)

# Experience Section
st.markdown("<h2 id='experience'>Experience</h2>", unsafe_allow_html=True)
for job in resume_data['experience']:
    st.markdown(f"<div class='experience-section'>", unsafe_allow_html=True)
    st.subheader(f"{job['company']} - {job['title']}")
    st.write(f"{job['date']} | {job['location']}")
    for highlight in job['highlights']:
        st.write(f"• {highlight}")
    st.markdown("</div>", unsafe_allow_html=True)

# Skills Section
st.markdown("<h2 id='skills'>Skills</h2>", unsafe_allow_html=True)
for category, skills in resume_data['skills'].items():
    st.subheader(category)
    st.write(", ".join(skills))

# Achievements Section
st.markdown("<h2 id='achievements'>Achievements</h2>", unsafe_allow_html=True)
for achievement in resume_data['achievements']:
    st.subheader(achievement['title'])
    st.write(achievement['description'])

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)
