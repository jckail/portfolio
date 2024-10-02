import streamlit as st
import requests
import streamlit.components.v1 as components

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

# Inject CSS to style the iframe and content
st.markdown(
    """
    <style>
    .stApp {
        background-color: transparent;
    }
    </style>
    <!-- Include Google Font -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <style>
    .content, .content * {
        color: white !important;
        font-family: 'Roboto', sans-serif;
    }
    iframe {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        z-index: -1;
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

# Display the resume content over the particles background
# Wrap content in a div with class 'content' to apply styles
st.markdown("<div class='content'>", unsafe_allow_html=True)

st.title(f"{resume_data['name']} - {resume_data['title']}")

st.header("Contact Information")
contact = resume_data['contact']
st.write(f"📞 {contact['phone']}")
st.write(f"📧 {contact['email']}")
st.write(f"📍 {contact['location']}")
st.write(f"🔗 [GitHub]({contact['github']})")

st.header("Experience")
for job in resume_data['experience']:
    st.subheader(f"{job['company']} - {job['title']}")
    st.write(f"{job['date']} | {job['location']}")
    for highlight in job['highlights']:
        st.write(f"• {highlight}")
    st.write("---")

st.header("Skills")
for category, skills in resume_data['skills'].items():
    st.subheader(category)
    st.write(", ".join(skills))

st.header("Achievements")
for achievement in resume_data['achievements']:
    st.subheader(achievement['title'])
    st.write(achievement['description'])

# Close the content div
st.markdown("</div>", unsafe_allow_html=True)
