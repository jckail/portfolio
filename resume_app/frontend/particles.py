def get_particle_js(selection, configs):
  x =  """
<style>
body {{
    margin: 0;
    padding: 0;
    background-color: {background_color}; /* Set the background color to black */
}}
#particles-js {{
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;  /* Ensure particles are behind the content */
}}
</style>

<div id="particles-js"></div>
<script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
<script>
particlesJS('particles-js', {{
  "particles": {{
    "number": {{
      "value": 30,
      "density": {{
        "enable": false,
        "value_area": 800
      }}
    }},
    "color": {{
      "value": {particle_color}
    }},
    "shape": {{
      "type": "circle",
      "stroke": {{
        "width": 0,
        "color": "#ffffff"
      }}
    }},
    "opacity": {{
      "value": 0.5211089197812949,
      "random": false,
      "anim": {{
        "enable": false,
        "speed": 1,
        "opacity_min": 1,
        "sync": false
      }}
    }},
    "size": {{
      "value": 5,
      "random": true,
      "anim": {{
        "enable": true,
        "speed": 0.1,
        "size_min": 0.1,
        "sync": true
      }}
    }},
    "line_linked": {{
      "enable": true,
      "distance": 150,
      "color": "{line_color}",
      "opacity": 0.7,
      "width": 1
    }},
    "move": {{
      "enable": true,
      "speed": .4,
      "direction": "none",
      "random": true,
      "straight": false,
      "out_mode": "bounce",
      "bounce": false,
      "attract": {{
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200
      }}
    }}
  }},
  "interactivity": {{
    "detect_on": "window",
    "events": {{
      "onhover": {{
        "enable": true,
        "mode": "grab"
      }},
      "onclick": {{
        "enable": true,
        "mode": "bubble"
      }},
      "resize": true
    }},
    "modes": {{
      "grab": {{
        "distance": 200,
        "line_linked": {{
          "opacity": 1
        }}
      }},
      "bubble": {{
        "distance": 200,
        "size": 4,
        "duration": 1,
        "opacity": 8,
        "speed": 5
      }},
      "repulse": {{
        "distance": 200,
        "duration": 0.4
      }},
      "push": {{
        "particles_nb": 4
      }},
      "remove": {{
        "particles_nb": 2
      }}
    }}
  }},
  "retina_detect": true
}});
</script>
  """

  return x.format(background_color=configs[selection]["background_color"], 
                  particle_color=configs[selection]["particle_color"], 
                  line_color=configs[selection]["line_color"])
  
  


