css = """
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
.header p {
    margin: 10px 0;
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
    padding-left: 20px;
    padding-right: 20px;
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
/* Sidebar styles */
.css-1d391kg {
    background-color: rgba(0, 0, 0, 0.3);
}
.sidebar-nav {
    padding: 10px;
}
.sidebar-nav a {
    display: block;
    color: #ffffff;
    text-decoration: none;
    margin-bottom: 10px;
    font-weight: bold;
    font-size: 0.9em;
}
.sidebar-nav a:hover {
    color: #00ff3c;
}
/* Expander styles */
.streamlit-expanderHeader {
    background-color: rgba(0, 0, 0, 0.5) !important;
    color: #ffffff !important;
}
.streamlit-expanderContent {
    background-color: rgba(0, 0, 0, 0.3) !important;
}
</style>
"""