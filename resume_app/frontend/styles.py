# styles.py


def get_styles_css(selection, configs):
    x = """<style>
    /* Import Google Font */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

    /* Base styles */
    body {{
        font-family: 'Roboto', sans-serif;
        font-size: 20px;
        
    }}

    /* Global text color */
    body, .stApp, .content, .content *, .stMarkdown, .stMarkdown p, .stMarkdown div,
    h1, h2, h3, h4, h5, h6, .stMarkdown h1, .stMarkdown h2, .stMarkdown h3, .stMarkdown h4, .stMarkdown h5, .stMarkdown h6 {{
        color: {text_color} !important;
    }}

    /* Reset padding and hide default header */
    #root > div:nth-child(1) > div > div > div > div > section > div {{
        padding-top: 0rem;
    }}
    header {{
        visibility: hidden;
    }}
    .stApp {{
        background-color: {background_color};
        backdrop-filter: blur(11px);
    }}

    /* Iframe styles */
    iframe {{
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        z-index: 0;
    }}

    /* Content styles */
    .content {{
        margin-top: 50px;
        padding-top: 40px;
        padding-left: 20px;
        padding-right: 20px;
        position: relative;
        z-index: 4;
    }}

        /* Section marker styles */
    .section-marker {{
        text-align: center;
        font-size: 2em;
        font-weight: bold;
        margin: 0 0 50px 0;
        color: {link_color} !important;
        border-bottom: 2px solid {link_color};
        padding-bottom: 5px;
        padding-top: 150px;
        margin-top: -140px;
        
    }}



    /* Header styles */
.stHorizontalBlock {{
    position: fixed;
    
    left: 0;
    right: 0;
    background-color: #1a1a1a;
    backdrop-filter: blur(5px);
    z-index: 2;
    text-align: center;
    border-radius: 5px;
    margin: 0 auto;
    padding: 5px;
    min-width: 100%;
    max-width: 100%;
    min-height: 10%;
    max-height: 10%;
    background-color: transparent;
}}
    .link-container {{
        padding-top: 12px;
        display: flex;
        justify-content: center;
        font-size: 1.3em !important;
        gap: 35px;
        text-decoration: underline;
    }}

    .header h2{{
        margin: 0;
        font-size: 3vw;
        color: {hover_color} !important;
    }}
    .header p {{
        margin: 10px 0;
    }}
    .header a {{
        color: {navbar_link_color} !important;
        text-decoration: none;
        font-size: 2vw;
        margin: 0 0px;
    }}
    .header a:hover {{
        color: {navbar_hover_color} !important;
        text-decoration: underline;
    }}





    /* Experience item styles */

    .experience-item h2, .experience-item p, .experience-item ul {{
        color: {text_color} !important;
        backdrop-filter: blur(1px);
        border-radius: 10px;
    }}
    .experience-item h2 {{
        font-size: 1.4em;
        margin-bottom: 1px;
    }}
    .experience-item p {{
        margin-bottom: 1px;
        font-size: .8em;
        backdrop-filter: blur(1px);
    }}
    .experience-item ul {{
        margin-top: 0;
        backdrop-filter: blur(1px);
    }}

    /* Override Streamlit's default styles */
    .stMarkdown, .stMarkdown p, .stMarkdown div, .stMarkdown span {{
        opacity: 1 !important;
        font-size: 1em !important;
        color: {text_color} !important;
    }}
    .stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {{
        font-weight: bold !important;
        color: {text_color} !important;
    }}

    

    /* Dark mode toggle styles */
    .stCheckbox {{
        
        top: 2px;
        right: 15px;
        z-index: 3;
    }}
    .st-ao {{
    background-color: {button_text};
}}
.st-bw {{
    background-color: {button_text};
}}

    .stCheckbox > label {{
        background-color: {button_background};
        border-radius: 20px;
        border: 1px solid {button_boarder};
        color: {button_text} !important;
        font-weight: bold;
        box-shadow: 0 0 1px {button_background};
        z-index: 3;
        
    }}
    .stCheckbox > label:hover {{
        background-color: {button_hover_background};
        box-shadow: 0 0 15px {button_background};
        z-index: 3;
    }}

    /* Hyperlink styles */
    a {{
        color: {link_color} !important;
        text-decoration: none;
    }}
    a:hover {{
        color: {hover_color} !important;
        text-decoration: underline;
    }}



    /* Flexbox for responsiveness */
    .container {{
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
    }}
    .column {{
        flex: 1;
        text-align: center;
    }}
/* Sidebar styles */
    /* Navigation menu styles */
    .nav-menu {{
        display: flex;
        justify-content: center;
        margin-top: 1px;
    }}
    .nav-menu a {{
        margin: 0 1px;
        font-size: 1.1em;
        font-weight: bold;
        color: {navbar_link_color} !important;
    }}


    .sidebar-nav a {{
        display: block;
        color: {navbar_link_color};
        text-decoration: none;
        margin-bottom: 10px;
        font-weight: bold;
        font-size: 0.9em;
    }}
    .sidebar-nav a:hover {{
        color: {navbar_hover_color};
    }}

    /* Expander styles */
    .streamlit-expanderHeader {{
        background-color: rgb(255, 0, 0) !important;
        color: {text_color} !important;
    }}
    .streamlit-expanderContent {{
        background-color: transparent !important;
    }}

    .st-emotion-cache-13na8ym {{
            background-color: {button_background} !important;
            border-radius: 5px;
    border: 1px solid {text_color};
    backdrop-filter: blur(5px);
    }}
    
    /* Left styles */
    .st-emotion-cache-1y9tyez {{
    background-color: {button_background};

    color: {button_text} !important;
    z-index: 3;
    color: {text_color} !important;
    margin-top: 1.5rem;
    

}}

/* Right styles */
.st-emotion-cache-1f3w014  {{
    z-index: 4;
    color: {text_color} !important;
    margin-top: .5rem;
            background-color: {button_background} !important;
            border-radius: 5px;
    border: 1px solid {text_color};
    backdrop-filter: blur(1px);
}}
    .st-emotion-cache-rpj0dg {{
    z-index: 3;
        background-color: {button_background} !important;
            border-radius: 5px;
    border: 1px solid {button_boarder};
    backdrop-filter: blur(1px);
        min-width: 150px;
        max-width: 250px;
    }}
    /* Responsive styles for smaller screens */

    @media (max-width: 900px) {{
        .stCheckbox {{
            right: 10px;
        }}
        .stCheckbox > label {{
            padding: 6px 10px;
            font-size: 1.5vw;
        }}
        .header h1, .header h3, .header h4 {{
            font-size: 3.5vw;
        }}
        .header p {{
            font-size: 3vw;
        }}
        .header a {{
            font-size: 3vw;
        }}
        .column.links {{
            text-align: center;
        }}
        .link-container {{
        
        display: flex;
        justify-content: center;
        font-size: 1vw;
        gap: 15px;
            row-gap: 0.5rem;
    column-gap: 0.5rem;
        text-decoration: underline;
            
        }}


.stSidebar {{
    position: relative;
    top: 0px;
    
    z-index: 4;
    
    
    transform: none;
    
    background-color: {button_background} !important;
    border-radius: 5px;
    border: 1px solid {button_boarder};
    backdrop-filter: blur(15px);

}}
    /* Section marker styles */
    .section-marker {{
        text-align: center;
        font-size: 1.8em;
        font-weight: bold;
        color: {link_color} !important;
        border-bottom: 2px solid {link_color};
        padding-bottom: 10px;
        padding-top: 200px;
        margin-top: -200px;
        
        
    }}
        .stHorizontalBlock {{
    position: fixed;
    left: 0;
    right: 0;

    backdrop-filter: blur(15px);
    z-index: 2;
    text-align: center;
    border-radius: 5px;
    margin: 0 auto;
    padding: 5px;
    min-width: 100%;
    max-width: 100%;
    min-height: 10%;
    max-height: 30%;
    background-color: transparent;
}}
            .content {{
        margin-top: 150px;
        padding-top: 40px;
        padding-left: 20px;
        padding-right: 20px;
        position: relative;
        z-index: 1;
    }}

    }}
    </style>
    """

    return x.format(
        background_color=configs[selection]["background_color"],
        text_color=configs[selection]["text_color"],
        link_color=configs[selection]["link_color"],
        hover_color=configs[selection]["hover_color"],
        button_background=configs[selection]["button_background"],
        button_text=configs[selection]["button_text"],
        button_hover_background=configs[selection]["button_hover_background"],
        button_boarder=configs[selection]["button_boarder"],
        header_background=configs[selection]["header_background"],
        header_text_color=configs[selection]["header_text_color"],
        footer_background=configs[selection]["footer_background"],
        footer_text_color=configs[selection]["footer_text_color"],
        navbar_background=configs[selection]["navbar_background"],
        navbar_link_color=configs[selection]["navbar_link_color"],
        navbar_hover_background=configs[selection]["navbar_hover_background"],
        navbar_hover_color=configs[selection]["navbar_hover_color"],
    )
