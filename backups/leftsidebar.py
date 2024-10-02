import streamlit as st
import requests
import streamlit.components.v1 as components
import base64

# API URL for fetching resume data
API_URL = "http://localhost:8000"

# Set the page configuration
st.set_page_config(page_title="Jordan Kail's Resume", layout="wide")

# Function to fetch resume data
def fetch_resume_data():
    response = requests.get(f"{API_URL}/resume")
    return response.json()

# Function to create a download link for the resume PDF
def get_pdf_download_link(file_path):
    with open(file_path, "rb") as f:
        bytes = f.read()
        b64 = base64.b64encode(bytes).decode()
        href = f'<a href="data:application/pdf;base64,{b64}" download="JordanKailResume.pdf">Download Resume</a>'
        return href

# Call the function to fetch resume data
resume_data = fetch_resume_data()

# Inject CSS to style the iframe, content, floating header, and hide Streamlit's default header
st.markdown(
    """
    <style>
    #root > div:nth-child(1) > div > div > div > div > section > div {padding-top: 0rem;}
    header {visibility: hidden;}
    .stApp {
        background-color: transparent;
    }
    /* Include Google Font */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    body {
        font-family: 'Roboto', sans-serif;
        font-size: 18px;
    }
    /* Global text color */
    body, .stApp, .content, .content *, .stMarkdown, .stMarkdown p, .stMarkdown div,
    h1, h2, h3, h4, h5, h6, .stMarkdown h1, .stMarkdown h2, .stMarkdown h3, .stMarkdown h4, .stMarkdown h5, .stMarkdown h6 {
        color: #ffffff !important;
    }
    iframe {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        z-index: -1;
    }
    /* Floating header styles */
    .header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(5px);
        padding: 20px;
        z-index: 1000;
        text-align: center;
    }
    .header h1 {
        margin: 0;
        font-size: 2.5em;
        color: #ffffff !important;
    }
    .header a {
        color: #ffffff !important;
        text-decoration: none;
    }
    .header a:hover {
        text-decoration: underline;
    }
    .nav-menu {
        display: flex;
        justify-content: center;
        margin-top: 15px;
    }
    .nav-menu a {
        margin: 0 20px;
        font-size: 1.1em;
        font-weight: bold;
        color: #ffffff !important;
    }
    /* Adjust content padding to account for floating header and navigation bar */
    .content {
        padding-top: 180px;
        padding-left: 100px;
    }
    .experience-item {
        margin-bottom: 30px;
    }
    .experience-item h3 {
        font-size: 1.4em;
        margin-bottom: 5px;
        color: #ffffff !important;
    }
    .experience-item p {
        margin-bottom: 10px;
        color: #ffffff !important;
    }
    .experience-item ul {
        margin-top: 0;
        color: #ffffff !important;
    }
    /* Override Streamlit's default styles */
    .stMarkdown, .stMarkdown p, .stMarkdown div, .stMarkdown span {
        opacity: 1 !important;
        font-size: 18px !important;
        color: #ffffff !important;
    }
    .stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
        font-weight: bold !important;
        color: #ffffff !important;
    }
    /* Section marker styles */
    .section-marker {
        text-align: center;
        font-size: 1.8em;
        font-weight: bold;
        margin: 40px 0 20px 0;
        color: #00ff3c !important;
        border-bottom: 2px solid #00ff3c;
        padding-bottom: 10px;
    }
    /* Popout navigation bar styles */
    .popout-nav {
        position: fixed;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 0 10px 10px 0;
        transition: opacity 0.3s ease-in-out;
        z-index: 1000;
        opacity: 0;
    }
    .popout-nav.visible {
        opacity: 1;
    }
    .popout-nav a {
        display: block;
        color: #ffffff;
        text-decoration: none;
        margin-bottom: 10px;
        font-weight: bold;
    }
    .popout-nav a:hover {
        color: #00ff3c;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# HTML + CSS for particles background
background_html = """
    <style>
    body {
        margin: 0;
        padding: 0;
        background-color: #000000; /* Set the background color to black */
    }
    #particles-js {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;  /* Ensure particles are behind the content */
    }
    </style>

    <div id="particles-js"></div>
    <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
    <script>
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
          "value": 0.5211089197812949,
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
    </script>
"""

# Inject the HTML and JavaScript into the Streamlit app
components.html(background_html, height=0)

# Create the floating header
st.markdown(f"""
    <div class="header">
        <h1>{resume_data['name']}</h1>
        <p>
            📞 {resume_data['contact']['phone']} |
            📧 <a href="mailto:{resume_data['contact']['email']}">{resume_data['contact']['email']}</a> |
            📍 {resume_data['contact']['location']} |
            🔗 <a href="{resume_data['contact']['github']}">GitHub</a>
        </p>
        <div class="nav-menu">
            {get_pdf_download_link("resume_app/backend/assets/JordanKailResume.pdf")}
        </div>
    </div>
""", unsafe_allow_html=True)

# Create the popout navigation bar
st.markdown("""
    <div class="popout-nav" id="popoutNav">
        <a href="#experience">Experience</a>
        <a href="#skills">Skills</a>
        <a href="#achievements">Achievements</a>
    </div>
""", unsafe_allow_html=True)

# Display the resume content over the particles background
# Wrap content in a div with class 'content' to apply styles
st.markdown("<div class='content'>", unsafe_allow_html=True)

# Experience Section
st.markdown('<div class="section-marker" id="experience">⚡️ Experience ⚡️</div>', unsafe_allow_html=True)
for job in resume_data['experience']:
    st.markdown(f"""
    <div class="experience-item">
        <h3>{job['company']} - {job['title']}</h3>
        <p>{job['date']} | {job['location']}</p>
        <ul>
        {''.join(f"<li>{highlight}</li>" for highlight in job['highlights'])}
        </ul>
    </div>
    """, unsafe_allow_html=True)

# Skills Section
st.markdown('<div class="section-marker" id="skills">🛠 Skills 🛠</div>', unsafe_allow_html=True)
for category, skills in resume_data['skills'].items():
    st.markdown(f"<h3>{category}</h3>", unsafe_allow_html=True)
    st.write(", ".join(skills))

# Achievements Section
st.markdown('<div class="section-marker" id="achievements">🏆 Achievements 🏆</div>', unsafe_allow_html=True)
for achievement in resume_data['achievements']:
    st.markdown(f"<h3>{achievement['title']}</h3>", unsafe_allow_html=True)
    st.write(achievement['description'])

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)

# Add JavaScript for smooth scrolling and popout navigation
st.markdown("""
<script>
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Function to check if an element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Function to handle scroll events
function handleScroll() {
    const sections = ['experience', 'skills', 'achievements'];
    const popoutNav = document.getElementById('popoutNav');
    
    let activeSection = null;
    
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element.getBoundingClientRect().top <= window.innerHeight / 2) {
            activeSection = section;
        }
    });
    
    if (activeSection) {
        popoutNav.classList.add('visible');
    } else {
        popoutNav.classList.remove('visible');
    }
}

// Add scroll event listener
window.addEventListener('scroll', handleScroll);

// Initial check on page load
handleScroll();
</script>
""", unsafe_allow_html=True)
