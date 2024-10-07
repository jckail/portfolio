##TODO: Add in dedicated page to display PDF with correct styling

# import sys
# import os

# # Add the root project directory to the sys.path
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


# import streamlit as st
# import requests
# import base64

# from frontend.streamlit_app import fetch_resume_data
# from frontend.styles import get_styles_css
# from frontend.particles import get_particle_js
# from frontend.components import create_header
# from frontend.configs import particle_config, styles_config

# # API URL for fetching resume PDF
# API_URL = os.environ.get("API_URL", "http://localhost:8000")

# st.set_page_config(page_title="View Resume", layout="wide")

# def download_resume_pdf():
#     url = f"{API_URL}/download_resume"
#     try:
#         # Send a GET request to the given URL
#         response = requests.get(url)
#         response.raise_for_status()

#         # Check if the content-type of the response is a PDF
#         if 'application/pdf' in response.headers.get('Content-Type', ''):
#             # Save the PDF content to a file
#             pdf_file_path = '/Users/jordankail/projects/quickResume/resume_app/frontend/pages/Jordan_Kail_Resume.pdf'
#             with open(pdf_file_path, 'wb') as f:
#                 f.write(response.content)

#             # Provide download button to download the file
#             with open(pdf_file_path, "rb") as pdf_file:
#                 st.download_button(
#                     label="Download Resume",
#                     data=pdf_file,
#                     file_name="Jordan_Kail_Resume.pdf",
#                     mime="application/pdf"
#                 )

#             # Display PDF in the app using HTML embed
#             pdf_display = f'<iframe src="data:application/pdf;base64,{base64.b64encode(response.content).decode()}" width="100%" height="800px"></iframe>'
#             st.markdown(pdf_display, unsafe_allow_html=True)
#         else:
#             st.error("The URL did not return a PDF file.")
#     except requests.exceptions.RequestException as e:
#         st.error(f"An error occurred: {e}")

# if 'theme' not in st.session_state:
#     st.session_state['theme'] = 'dark'

# def toggle_theme():
#     st.session_state['theme'] = 'light' if st.session_state['theme'] == 'dark' else 'dark'


# # resume_data = fetch_resume_data()

# # # Inject CSS based on the theme
# st.markdown(get_styles_css(st.session_state['theme'], styles_config), unsafe_allow_html=True)
# st.components.v1.html(get_particle_js(st.session_state['theme'], particle_config), height=0)

# # # Create header with theme toggle
# # theme_icon = '🌙' if st.session_state['theme'] == 'dark' else '☀️'
# # create_header(resume_data['name'], resume_data['contact'], theme_icon, st.session_state['theme'] == 'dark', toggle_theme)



# st.title("📄 View Resume")
# download_resume_pdf()
# # st.markdown("""
# #             <style>
# # html {
# #   /* The viewer implements a custom pinch zoom. */
# #   touch-action: pan-x pan-y;
# # }

# # body {
# #   background-color: transparent;
# #   color: var(--primary-text-color);
# #   line-height: 154%;
# #   margin: 0;
# # }

# # pdf-viewer#viewer {
# #   padding-top:100px
# # }

# # .stMainBlockContainer {
# #     position: absolute;
# #     background: transparent;
# #     color: transparent;
# #     inset: 0px;
# #     color-scheme: dark;
# #     overflow: hidden;
# # }

# # </style>
# # """, unsafe_allow_html=True)