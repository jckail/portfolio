// configs.js

// API Configuration
export const API_CONFIG = {
    baseUrl: window.location.origin,
    endpoints: {
        admin: {
            login: '/api/admin/login',
            verify: '/api/admin/verify',
            logout: '/api/admin/logout'
        },
        telemetry: '/api/telemetry'
    }
};

// Define primary colors
export const PRIMARY = "#0403ff";
export const BLACK = "#000000";
export const WHITE = "#ffffff";

// Particle configurations for dark and light themes
export const particleConfig = {
    dark: {
        background_color: BLACK,
        particle_color: [PRIMARY, WHITE, PRIMARY],
        line_color: PRIMARY
    },
    light: {
        background_color: WHITE,
        particle_color: [PRIMARY, BLACK, PRIMARY],
        line_color: PRIMARY
    }
};

// Styles configuration for light and dark themes
export const stylesConfig = {
    dark: {
        background_color: BLACK,
        text_color: WHITE,
        link_color: WHITE,
        hover_color: PRIMARY,
        button_background: "transparent",
        button_text: PRIMARY,
        button_hover_background: PRIMARY,
        button_border: BLACK,
        header_background: "#1a1a1a",
        header_text_color: WHITE,
        footer_background: "#1a1a1a",
        footer_text_color: WHITE,
        navbar_background: "#333333",
        navbar_link_color: "#dddddd",
        navbar_hover_background: "#575757",
        navbar_hover_color: WHITE,
    },
    light: {
        background_color: WHITE,
        text_color: BLACK,
        link_color: BLACK,
        hover_color: PRIMARY,
        button_background: "#57575700",
        button_text: PRIMARY,
        button_hover_background: PRIMARY,
        button_border: BLACK,
        header_background: "#f1f1f1",
        header_text_color: BLACK,
        footer_background: "#f1f1f1",
        footer_text_color: BLACK,
        navbar_background: "#ffffff",
        navbar_link_color: BLACK,
        navbar_hover_background: "#e0e0e0",
        navbar_hover_color: BLACK,
    }
};
