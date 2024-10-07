
import streamlit as st
import requests
import base64

def download_resume_pdf(url):
    try:
        url = f"{url}/download_resume"
        # Send a GET request to the given URL
        response = requests.get(url)
        
        # Raise an exception for bad status codes
        response.raise_for_status()
        
        # Check if the content-type of the response is a PDF
        if 'application/pdf' in response.headers.get('Content-Type', ''):
            # Save the PDF content to a file
            with open('Jordan_Kail_Resume.pdf', 'wb') as f:
                f.write(response.content)
            if response.status_code == 200:
                # Encode the PDF content as base64
                pdf_base64 = base64.b64encode(response.content).decode('utf-8')
                download_link = f'data:application/pdf;base64,{pdf_base64}'
                return download_link
            else:
                download_link = None
            print("PDF downloaded successfully as 'Jordan_Kail_Resume.pdf'")
        else:
            print("The URL did not return a PDF file.")
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")


def create_header(name, contact, theme_icon, theme_value, toggle_theme,BACKEND_URL):
    
    download_link = download_resume_pdf(BACKEND_URL)
    
    # Header with HTML formatting for name, contact details, and download button
    download_button = '<a class="link-container" href="' + download_link + f'" download="{name.replace(" ", "_")}_Resume.pdf" > 📄 Resume</a>' if download_link else '<span class="error-message">Failed to load resume</span>'

    # Create a container for the header

    [col0, col1, col2,col3]= st.columns([.05, .30,.55,.1])
    with col0:
        with st.sidebar.expander("📚 Navigation", expanded=True):  # Sidebar starts collapsed
            st.markdown("""
            <nav class="sidebar-nav">
                <ul>
                    <li><a href="#experience">⚡️ Experience</a></li>
                    <li><a href="#skills">🛠 Technical Skills</a></li>
                    <li><a href="#projects">🏆 Projects</a></li>
                </ul>
            </nav>
            """, unsafe_allow_html=True)
        with st.sidebar.expander("ℹ️ Contact", expanded=True):  # Sidebar starts collapsed
            st.markdown(f"""
            <nav class="sidebar-nav">
                                        <p>
                     📍 {contact['location']} 
                </p>
                <p>
                    📞 {contact['phone']} 
                </p>
                                <p>
                     <a href="mailto:{contact['email']}"> 📧 {contact['email']}</a> 
                </p>
                <p>Open To:</p>
                <ul>
                    <li>Relocation</li>
                    <li>Working Remote</li>
                    <li>Working In Office</li>
                    <li>Full time Travel</li>
                </ul>

            </nav>
            """, unsafe_allow_html=True)
    with col1:
        st.markdown(f"""
    <div class="name-container">
        <h1> {name} </h1>
    </div>
            """, unsafe_allow_html=True)
        
    with col2:
        st.markdown(f"""
            
            <div class="link-container">
                <a class="link-container" href="{contact['github']}" target="_blank">🤖 GitHub</a>
                <a class="link-container" href="{contact['linkedin']}" target="_blank">👔 LinkedIn</a>
                {download_button}
            </div>
            """, unsafe_allow_html=True)
        
    
    
    with col3:
        st.toggle(theme_icon, value=theme_value, key="theme_toggle", on_change=toggle_theme)



def create_section(title, content):
    st.markdown(f'<div class="section-marker" id="{title.lower()}">{"⚡️" if title == "Experience" else "🛠" if title == "Technical Skills" else "🏆"} {title} {"⚡️" if title == "Experience" else "🛠" if title == "Technical Skills" else "🏆"}</div>', unsafe_allow_html=True)
    st.markdown(content, unsafe_allow_html=True)

def create_experience_item(job):
    
    return f"""
    <div class="experience-item">
        <h2><a href="{job["link"]}" target="_blank">{job["company"]}</a></h2>
            <p>{job['title']} </p>
            <p>{job['location']}</p>
            <p>{job['date']}</p>
        <ul>
        {''.join(f"<li>{highlight}</li>" for highlight in job['highlights'])}
        </ul>
        
    </div>
    """

def create_skills_section(skills):
    content = ""
    for category, skill_list in skills.items():
        content += f'<div class="experience-item">'
        content += f"<h2>{category}</h2>"
        content += f'<p>{", ".join(skill_list)}</p>'
        content += "<br><br>"
        content += "</div>"
    return content

def create_projects_section(projects):
    content = ""
    for project in projects:
        content += f'<div class="experience-item">'
        content += f'<h2><a href="{project["link"]}" target="_blank">{project["title"]}</a></h2>'
        if project.get('link2'):
            content += f'<p><a href="{project["link2"]}" target="_blank">See in Action</a></p>'
        content += f"<p>{project['description']}</p>"
        content += "</div>"
    return content