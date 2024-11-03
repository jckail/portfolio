import { PRIMARY, BLACK, WHITE } from '@/config/constants';

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
} as const;
