import pathlib
import shutil
import logging
from bs4 import BeautifulSoup
import streamlit as st

def modify_tag_content(tag_name, new_content, favicon_filename=None):
    index_path = pathlib.Path(st.__file__).parent / "static" / "index.html"
    logging.info(f'Editing {index_path}')
    
    soup = BeautifulSoup(index_path.read_text(), features="html.parser")

    if tag_name == 'link' and favicon_filename:
        # Modify or add favicon link tag
        favicon_tag = soup.find('link', {'rel': 'icon'})
        if favicon_tag:
            favicon_tag['href'] = favicon_filename
        else:
            favicon_tag = soup.new_tag('link', rel='icon', href=favicon_filename)
            if soup.head:
                soup.head.append(favicon_tag)
    else:
        target_tag = soup.find(tag_name)  # find the target tag

        if target_tag:  # if target tag exists
            target_tag.string = new_content  # modify the tag content
        else:  # if target tag doesn't exist, create a new one
            target_tag = soup.new_tag(tag_name)
            target_tag.string = new_content
            try:
                if tag_name in ['title', 'script', 'noscript'] and soup.head:
                    soup.head.append(target_tag)
                elif soup.body:
                    soup.body.append(target_tag)
            except AttributeError as e:
                logging.error(f"Error when trying to append {tag_name} tag: {e}")
                return

    # Save the changes
    bck_index = index_path.with_suffix('.bck')
    if not bck_index.exists():
        shutil.copy(index_path, bck_index)  # keep a backup
    index_path.write_text(str(soup))

# Example usage with modifying the title and favicon
modify_tag_content('title', 'Jordan Kail Portfolio')
modify_tag_content('noscript', 'Jordan Kail Portfolio')
modify_tag_content('link', '', favicon_filename='/images/favicon.ico')
