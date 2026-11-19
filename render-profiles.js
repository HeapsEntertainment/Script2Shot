(function (global) {
  'use strict';

  // Software & Render Engine Profiles (3D CGI & 2D Animation)
  // Values represent estimated seconds of render time per 1 second of finished animation.
  var SOFTWARE_PROFILES = {
    // --- 3D / CGI Engines ---
    'eevee': {
      id: 'eevee',
      label: 'Blender Eevee',
      medium: '3d-cgi',
      defaultLenses: ['18mm Virtual', '24mm Virtual', '35mm Virtual', '50mm Virtual', '85mm Virtual', '135mm Virtual', 'Ortho'],
      rates: {
        '1080p_draft': 4,
        '1080p_med': 12,
        '1080p_high': 24,
        '4k_med': 30,
        '4k_high': 60
      }
    },
    'cycles': {
      id: 'cycles',
      label: 'Blender Cycles',
      medium: '3d-cgi',
      defaultLenses: ['18mm Virtual', '24mm Virtual', '35mm Virtual', '50mm Virtual', '85mm Virtual', '135mm Virtual', 'Ortho'],
      rates: {
        '1080p_draft': 48,
        '1080p_med': 120,
        '1080p_high': 300,
        '4k_med': 360,
        '4k_high': 900
      }
    },
    'unreal': {
      id: 'unreal',
      label: 'Unreal Engine (Lumen / Path Tracer)',
      medium: '3d-cgi',
      defaultLenses: ['16mm Cine', '24mm Cine', '35mm Cine', '50mm Cine', '85mm Cine', '135mm Cine'],
      rates: {
        '1080p_draft': 2,
        '1080p_med': 6,
        '1080p_high': 18,
        '4k_med': 15,
        '4k_high': 45
      }
    },
    'arnold': {
      id: 'arnold',
      label: 'Maya / Arnold Raytracer',
      medium: '3d-cgi',
      defaultLenses: ['18mm Arnold', '24mm Arnold', '35mm Arnold', '50mm Arnold', '85mm Arnold', '135mm Arnold'],
      rates: {
        '1080p_draft': 60,
        '1080p_med': 150,
        '1080p_high': 360,
        '4k_med': 420,
        '4k_high': 1080
      }
    },

    // --- 2D Animation Software ---
    'gpencil-eevee': {
      id: 'gpencil-eevee',
      label: 'Blender Grease Pencil (Eevee)',
      medium: '2d-anim',
      defaultLenses: ['16-Field', '12-Field', '10-Field', '8-Field', '6-Field', '4-Field', '2-Field', '35mm Virtual'],
      rates: {
        '1080p_draft': 3,
        '1080p_med': 8,
        '1080p_high': 16,
        '4k_med': 20,
        '4k_high': 40
      }
    },
    'gpencil-cycles': {
      id: 'gpencil-cycles',
      label: 'Blender Grease Pencil (Cycles)',
      medium: '2d-anim',
      defaultLenses: ['16-Field', '12-Field', '10-Field', '8-Field', '6-Field', '4-Field', '2-Field', '35mm Virtual'],
      rates: {
        '1080p_draft': 30,
        '1080p_med': 75,
        '1080p_high': 180,
        '4k_med': 220,
        '4k_high': 540
      }
    },
    'harmony': {
      id: 'harmony',
      label: 'Toon Boom Harmony',
      medium: '2d-anim',
      defaultLenses: ['16-Field', '12-Field', '10-Field', '8-Field', '6-Field', '4-Field', '3-Field', '2-Field', 'Multiplane'],
      rates: {
        '1080p_draft': 2,
        '1080p_med': 5,
        '1080p_high': 12,
        '4k_med': 14,
        '4k_high': 32
      }
    },
    'tvpaint': {
      id: 'tvpaint',
      label: 'TVPaint / Traditional Raster 2D',
      medium: '2d-anim',
      defaultLenses: ['16-Field', '12-Field', '10-Field', '8-Field', '6-Field', '4-Field', '2-Field'],
      rates: {
        '1080p_draft': 1.5,
        '1080p_med': 4,
        '1080p_high': 8,
        '4k_med': 10,
        '4k_high': 22
      }
    }
  };

  // Medium / Project Format Presets & Shot Size Lens Defaults
  var FORMAT_PRESETS = {
    'live-ff': {
      label: 'Live Action (Full Frame)',
      isRenderMedium: false,
      defaultSetupMins: 15,
      defaultRenderRate: 24,
      description: 'Full-Frame 35mm digital/film sensors (36x24mm). Wide vista primes (16-24mm) and flattering 85-100mm portrait close-ups.',
      lenses: ['16mm', '24mm', '28mm', '35mm', '50mm', '85mm', '100mm Macro', '135mm', '24-70mm'],
      defaults: {
        'EWS': { lens: '16mm', mins: 25 },
        'WS': { lens: '24mm', mins: 20 },
        'FS': { lens: '35mm', mins: 15 },
        'MWS': { lens: '35mm', mins: 15 },
        'MS': { lens: '35mm', mins: 15 },
        'MCU': { lens: '50mm', mins: 12 },
        'CU': { lens: '85mm', mins: 12 },
        'ECU': { lens: '100mm Macro', mins: 15 },
        'INS': { lens: '100mm Macro', mins: 10 },
        'OTS': { lens: '50mm', mins: 15 },
        'POV': { lens: '35mm', mins: 12 },
        'TWO-SHOT': { lens: '35mm', mins: 15 }
      }
    },
    'live-s35': {
      label: 'Live Action (Super 35)',
      isRenderMedium: false,
      defaultSetupMins: 15,
      defaultRenderRate: 24,
      description: 'Super 35 / APS-C cinema sensors (~1.5x crop vs Full Frame). Uses slightly wider focal lengths for equivalent field of view.',
      lenses: ['12mm', '14mm', '18mm', '24mm', '28mm', '35mm', '40mm', '65mm', '85mm', '18-55mm'],
      defaults: {
        'EWS': { lens: '12mm', mins: 25 },
        'WS': { lens: '18mm', mins: 20 },
        'FS': { lens: '24mm', mins: 15 },
        'MWS': { lens: '28mm', mins: 15 },
        'MS': { lens: '28mm', mins: 15 },
        'MCU': { lens: '40mm', mins: 12 },
        'CU': { lens: '65mm', mins: 12 },
        'ECU': { lens: '85mm', mins: 15 },
        'INS': { lens: '85mm', mins: 10 },
        'OTS': { lens: '40mm', mins: 15 },
        'POV': { lens: '24mm', mins: 12 },
        'TWO-SHOT': { lens: '28mm', mins: 15 }
      }
    },
    '2d-anim': {
      label: '2D Animation (Field Sizes)',
      isRenderMedium: true,
      defaultEngine: 'harmony',
      defaultSetupMins: 2,
      defaultRenderRate: 5,
      description: 'Traditional & digital 2D animation camera charts using Field Sizes (16-Field wide down to 2-Field tight) and software compositing/render rates.',
      lenses: ['16-Field', '12-Field', '10-Field', '8-Field', '6-Field', '4-Field', '3-Field', '2-Field', 'Multiplane'],
      defaults: {
        'EWS': { lens: '16-Field', mins: 2 },
        'WS': { lens: '12-Field', mins: 2 },
        'FS': { lens: '10-Field', mins: 2 },
        'MWS': { lens: '8-Field', mins: 2 },
        'MS': { lens: '8-Field', mins: 2 },
        'MCU': { lens: '6-Field', mins: 2 },
        'CU': { lens: '4-Field', mins: 2 },
        'ECU': { lens: '2-Field', mins: 2 },
        'INS': { lens: '3-Field', mins: 2 },
        'OTS': { lens: '6-Field', mins: 2 },
        'POV': { lens: '10-Field', mins: 2 },
        'TWO-SHOT': { lens: '8-Field', mins: 2 }
      }
    },
    '3d-cgi': {
      label: '3D / CGI Virtual Camera',
      isRenderMedium: true,
      defaultEngine: 'eevee',
      defaultSetupMins: 3,
      defaultRenderRate: 12,
      description: 'Virtual camera focal-length presets and frame/sample render estimation across Blender Eevee, Cycles, Unreal, and Arnold.',
      lenses: ['18mm Virtual', '24mm Virtual', '35mm Virtual', '50mm Virtual', '85mm Virtual', '135mm Virtual', 'Ortho'],
      defaults: {
        'EWS': { lens: '18mm Virtual', mins: 3 },
        'WS': { lens: '24mm Virtual', mins: 3 },
        'FS': { lens: '35mm Virtual', mins: 3 },
        'MWS': { lens: '35mm Virtual', mins: 3 },
        'MS': { lens: '35mm Virtual', mins: 3 },
        'MCU': { lens: '50mm Virtual', mins: 3 },
        'CU': { lens: '85mm Virtual', mins: 3 },
        'ECU': { lens: '135mm Virtual', mins: 3 },
        'INS': { lens: '85mm Virtual', mins: 3 },
        'OTS': { lens: '50mm Virtual', mins: 3 },
        'POV': { lens: '24mm Virtual', mins: 3 },
        'TWO-SHOT': { lens: '35mm Virtual', mins: 3 }
      }
    },
    'docu': {
      label: 'Documentary / Run & Gun',
      isRenderMedium: false,
      defaultSetupMins: 8,
      defaultRenderRate: 15,
      description: 'Fast zoom-lens setups (24-70mm & 70-200mm) optimized for single-operator mobility and rapid coverage.',
      lenses: ['24-70mm @ 24mm', '24-70mm @ 35mm', '24-70mm @ 50mm', '70-200mm @ 85mm', '70-200mm @ 135mm', '16-35mm @ 16mm'],
      defaults: {
        'EWS': { lens: '16-35mm @ 16mm', mins: 10 },
        'WS': { lens: '24-70mm @ 24mm', mins: 8 },
        'FS': { lens: '24-70mm @ 35mm', mins: 8 },
        'MWS': { lens: '24-70mm @ 35mm', mins: 6 },
        'MS': { lens: '24-70mm @ 35mm', mins: 6 },
        'MCU': { lens: '24-70mm @ 50mm', mins: 6 },
        'CU': { lens: '70-200mm @ 85mm', mins: 6 },
        'ECU': { lens: '70-200mm @ 135mm', mins: 8 },
        'INS': { lens: '24-70mm @ 70mm', mins: 5 },
        'OTS': { lens: '24-70mm @ 50mm', mins: 6 },
        'POV': { lens: '24-70mm @ 24mm', mins: 6 },
        'TWO-SHOT': { lens: '24-70mm @ 35mm', mins: 8 }
      }
    }
  };

  global.SOFTWARE_PROFILES = SOFTWARE_PROFILES;
  global.FORMAT_PRESETS = FORMAT_PRESETS;
})(window);