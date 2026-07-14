import os
import shutil
import colorsys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

# Paths
BG_PATH = r'C:\Users\thufl\.gemini\antigravity\brain\bfca5fac-3900-4a34-ada1-8ed9e46d0898\media__1783980914559.jpg'
LOGOS_DIR = r'C:\Users\thufl\Downloads\playerlogos (1)'
OUTPUT_DIR = r'C:\Users\thufl\.gemini\antigravity\scratch\pennyantepoker-copy\public\player_badges'

FONT_PATH_SCRIPT = r'C:\Windows\Fonts\BRUSHSCI.TTF'
FONT_PATH_SERIF = r'C:\Windows\Fonts\georgiab.ttf'

COLOR_OVERRIDES = {
    "guy vider": (0, 220, 0),
    "gabe elliott": (20, 100, 110),
    "juanito cunanan": (215, 6, 8),
    "tim hufler": (180, 5, 10),
    "tom scharf": (180, 5, 10),
    "wendy bumgardner": (160, 4, 12),
    "nichlas priest": (180, 5, 10),
    "mary lind handy": (255, 110, 0),
    "mary handy": (255, 110, 0),
    "christopher hirsh": (30, 30, 30),
    "ryan buell": (20, 20, 20),
    "berta allen": (0, 160, 20),
    "rachelle allen": (0, 160, 20),
    "albert jamito": (0, 50, 140),
    "angela koontz": (200, 8, 12),
    "bruce knutson": (180, 5, 10),
    "woody christopher woody": (0, 130, 50),
    "christopher woody": (0, 130, 50),
    "andrew palacios": (20, 100, 110),
    "andrew richardson": (215, 6, 8),
    "abbi sweet": (240, 20, 110),
    "jason hofbauer": (0, 50, 140),
    "ron hawkins": (215, 6, 8),
    "doug berg": (0, 120, 240),
    "dave morales": (235, 180, 0),
    "evan elliott": (0, 70, 180),
    "bill foley": (240, 120, 0),
    "brian pennebaker": (215, 6, 8),
    "brian syfrett": (40, 180, 0),
    "cody dempsey": (240, 170, 0),
    "cristina miller": (180, 5, 10),
    "dan grimani": (130, 0, 220),
    "derek allen": (220, 220, 225)
}

def find_player_logo(full_name):
    if not os.path.exists(LOGOS_DIR):
        return None
    for filename in os.listdir(LOGOS_DIR):
        base, ext = os.path.splitext(filename)
        clean_base = base.lower().replace('_', ' ').replace('-', ' ').strip()
        clean_name = full_name.lower().replace('_', ' ').replace('-', ' ').strip()
        if clean_base == clean_name:
            return os.path.join(LOGOS_DIR, filename)
        if clean_base.replace(' ', '') == clean_name.replace(' ', ''):
            return os.path.join(LOGOS_DIR, filename)
    return None

def extract_theme_color(logo_path):
    try:
        logo_img = Image.open(logo_path).convert('RGBA')
        small_img = logo_img.resize((50, 50), Image.Resampling.NEAREST)
        pixels = list(small_img.getdata())
        
        best_color = None
        max_sat = -1
        
        for r, g, b, a in pixels:
            if a < 50:
                continue
            if r > 240 and g > 240 and b > 240:
                continue
            if r < 15 and g < 15 and b < 15:
                continue
                
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            if s > max_sat:
                max_sat = s
                best_color = (r, g, b)
                
        if best_color and max_sat > 0.15:
            return best_color
    except Exception as e:
        print(f"Error extracting color: {e}")
    return (200, 10, 15)

def get_player_theme_color(full_name, logo_path):
    name_key = full_name.lower().strip()
    if name_key in COLOR_OVERRIDES:
        return COLOR_OVERRIDES[name_key]
    if logo_path and os.path.exists(logo_path):
        return extract_theme_color(logo_path)
    return (200, 10, 15)

def apply_color_tint(bg_img, color):
    h, s, v = colorsys.rgb_to_hsv(color[0]/255.0, color[1]/255.0, color[2]/255.0)
    if s < 0.1:
        # Steel grey metallic tint for silver/grey theme
        tint_color = (130, 135, 145)
        tint = Image.new('RGBA', bg_img.size, tint_color + (255,))
        tinted = Image.blend(bg_img.convert('RGBA'), tint, 0.18)
        return tinted
    r, g, b = colorsys.hsv_to_rgb(h, 0.4, 0.6)
    tint_color = (int(r * 255), int(g * 255), int(b * 255))
    tint = Image.new('RGBA', bg_img.size, tint_color + (255,))
    tinted = Image.blend(bg_img.convert('RGBA'), tint, 0.12)
    return tinted

def get_notched_polygon(x0, y0, x1, y1, notch):
    return [
        (x0 + notch, y0),
        (x1 - notch, y0),
        (x1 - notch, y0 + notch),
        (x1, y0 + notch),
        (x1, y1 - notch),
        (x1 - notch, y1 - notch),
        (x1 - notch, y1),
        (x0 + notch, y1),
        (x0 + notch, y1 - notch),
        (x0, y1 - notch),
        (x0, y0 + notch),
        (x0 + notch, y0 + notch)
    ]

# Resolution scale
SCALE = 4
FONT_SIZE_FIRST = 180 * SCALE  # 50% bigger than 120
FONT_SIZE_LAST = 135 * SCALE   # 75% of first name size (180)
BLACK_STROKE = 7 * SCALE
GOLD_STROKE = 5 * SCALE
INNER_STROKE = 1.5 * SCALE

RED_TOP = (215, 6, 8, 255)
RED_BOT = (75, 0, 2, 255)
GOLD_TOP = (255, 230, 110, 255)
GOLD_BOT = (170, 130, 40, 255)
INNER_COLOR = (40, 0, 2, 255)

# The 73 active players mapped to their 3-digit member numbers
PLAYERS_MAP = {
    "Derek Allen": "101",
    "Berta Allen": "102",
    "Rachelle Allen": "103",
    "Terri Angell": "104",
    "Bill Baker": "105",
    "Travis Baker": "106",
    "Doug Berg": "107",
    "Michelle Boyle": "108",
    "Mark Browning": "109",
    "Ryan Buell": "110",
    "Wendy Bumgardner": "111",
    "Shawn Cagle": "112",
    "Tom Colemon": "113",
    "Juanito Cunanan": "114",
    "Cody Dempsey": "115",
    "Evan Elliott": "116",
    "Gabe Elliott": "117",
    "Tiffany Field": "118",
    "Bill Foley": "119",
    "Mihail Gizea": "120",
    "Cody Glaess": "121",
    "Dan Grimani": "122",
    "Katrina Hambleton": "123",
    "Steve Hambleton": "124",
    "Michelle Hanning": "125",
    "Steve Hanning": "126",
    "Ron Hawkins": "127",
    "Zac Hawkins": "128",
    "Luke Hewlett": "129",
    "Christopher Hirsh": "130",
    "Jason Hofbauer": "131",
    "Paul Hollomon": "132",
    "Tim Hufler": "133",
    "Chris Imai": "134",
    "Albert Jamito": "135",
    "Bruce Knutson": "136",
    "Angela Koontz": "137",
    "Chad Larsen": "138",
    "Mary Lind Handy": "139",
    "Korri Lind": "140",
    "Sean Manley": "141",
    "James Marcy": "142",
    "Dennis Mccord": "143",
    "Christopher Miles": "144",
    "Cristina Miller": "145",
    "Dave Morales": "146",
    "Sebastian Osorio": "147",
    "James Patterson": "148",
    "Brian Pennebaker": "149",
    "David Philossof": "150",
    "Dan Pietila": "151",
    "Nichlas Priest": "152",
    "Chris Robbins": "153",
    "Test Sample": "154",
    "Thomas Scharf": "155",
    "Tom Scharf": "156",
    "Kacy Schlosser Buffum": "157",
    "Carlie Sharling": "158",
    "Tony Slaven": "159",
    "Jermaine Spino": "160",
    "Nick Stoltz": "161",
    "Trent Sundvick": "162",
    "Abbi Sweet": "163",
    "Brian Syfrett": "164",
    "Mark Tanner": "165",
    "Tory Thom": "166",
    "Rita Turney": "167",
    "Guy Vider": "168",
    "Lynn Villemyer": "169",
    "Johnathan Viloria": "170",
    "Denny Wade": "171",
    "Christopher Woody": "172",
    "Woody Christopher Woody": "172",
    "Bill Yentsch": "173"
}

def sanitize_filename(name):
    sanitized = name.strip().lower().replace(' ', '_')
    return ''.join(c for c in sanitized if c.isalnum() or c == '_') + '.png'

def make_vertical_gradient(w, h, color1, color2):
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    pixels = base.load()
    for y in range(h):
        t = y / (h - 1) if h > 1 else 0
        r = int(color1[0] * (1 - t) + color2[0] * t)
        g = int(color1[1] * (1 - t) + color2[1] * t)
        b = int(color1[2] * (1 - t) + color2[2] * t)
        a = int(color1[3] * (1 - t) + color2[3] * t)
        for x in range(w):
            pixels[x, y] = (r, g, b, a)
    return base

def render_line_mask_rotated(text, font, angle, stroke_w=0):
    temp_w = 1200 * SCALE
    temp_h = 400 * SCALE
    
    img_mask = Image.new('L', (temp_w, temp_h), 0)
    draw = ImageDraw.Draw(img_mask)
    
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    tx = (temp_w - tw) // 2
    ty = (temp_h - th) // 2 - bbox[1]
    
    if stroke_w > 0:
        draw.text((tx, ty), text, font=font, fill=255, stroke_width=int(stroke_w), stroke_fill=255)
    draw.text((tx, ty), text, font=font, fill=255)
    
    rotated = img_mask.rotate(angle, resample=Image.Resampling.BICUBIC)
    
    c_bbox = rotated.getbbox()
    if c_bbox:
        return rotated.crop(c_bbox)
    return rotated

def render_name_layer_rotated(text, font_path, font_size, y_center, angle, canvas_w, canvas_h, theme_color, bottom_y=None):
    r, g, b = theme_color
    red_top = (min(255, int(r * 1.25)), min(255, int(g * 1.25)), min(255, int(b * 1.25)), 255)
    red_bot = (int(r * 0.45), int(g * 0.45), int(b * 0.45), 255)
    inner_color = (int(r * 0.15), int(g * 0.15), int(b * 0.15), 255)

    fsize = font_size
    font = ImageFont.truetype(font_path, fsize)
    
    dummy = Image.new('L', (100, 100), 0)
    d_dummy = ImageDraw.Draw(dummy)
    bbox = d_dummy.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    
    safe_w = canvas_w - 100 * SCALE
    if w > safe_w:
        fsize = int(fsize * (safe_w / w))
        font = ImageFont.truetype(font_path, fsize)
    
    black_mask = render_line_mask_rotated(text, font, angle, BLACK_STROKE)
    gold_mask = render_line_mask_rotated(text, font, angle, GOLD_STROKE)
    inner_mask = render_line_mask_rotated(text, font, angle, INNER_STROKE)
    fill_mask = render_line_mask_rotated(text, font, angle, 0)
    
    w_rot, h_rot = black_mask.size
    px = (canvas_w - w_rot) // 2
    if bottom_y is not None:
        py = bottom_y * SCALE - h_rot
    else:
        py = y_center * SCALE - h_rot // 2
    
    line_img = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    line_black_mask = Image.new('L', (canvas_w, canvas_h), 0)
    line_black_mask.paste(black_mask, (px, py))
    
    # Paste black outline
    black_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 255))
    line_img.paste(black_layer, (0, 0), mask=line_black_mask)
    
    # Paste gold gradient outline
    gold_mask_full = Image.new('L', (canvas_w, canvas_h), 0)
    gold_mask_full.paste(gold_mask, (px, py))
    g_bbox = gold_mask_full.getbbox()
    if g_bbox:
        gy1, gy2 = g_bbox[1], g_bbox[3]
        gold_grad = make_vertical_gradient(canvas_w, max(1, gy2 - gy1), GOLD_TOP, GOLD_BOT)
        gold_grad_canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        gold_grad_canvas.paste(gold_grad, (0, gy1))
        line_img.paste(gold_grad_canvas, (0, 0), mask=gold_mask_full)
        
    # Paste inner outline (solid dark theme color)
    inner_mask_full = Image.new('L', (canvas_w, canvas_h), 0)
    inner_mask_full.paste(inner_mask, (px, py))
    inner_layer = Image.new('RGBA', (canvas_w, canvas_h), inner_color)
    line_img.paste(inner_layer, (0, 0), mask=inner_mask_full)
    
    # Paste theme gradient fill locally
    fill_mask_full = Image.new('L', (canvas_w, canvas_h), 0)
    fill_mask_full.paste(fill_mask, (px, py))
    r_bbox = fill_mask_full.getbbox()
    if r_bbox:
        ry1, ry2 = r_bbox[1], r_bbox[3]
        theme_grad = make_vertical_gradient(canvas_w, max(1, ry2 - ry1), red_top, red_bot)
        theme_grad_canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        theme_grad_canvas.paste(theme_grad, (0, ry1))
        line_img.paste(theme_grad_canvas, (0, 0), mask=fill_mask_full)
    
    return line_img, line_black_mask

def wrap_text(text, font, max_width):
    words = text.split(' ')
    if len(words) <= 1:
        return [text]
    
    dummy = Image.new('L', (100, 100), 0)
    draw = ImageDraw.Draw(dummy)
    
    # Check if the entire text already fits on one line
    w = draw.textbbox((0, 0), text, font=font)[2]
    if w <= max_width:
        return [text]
        
    # For two words, put each word on its own line
    if len(words) == 2:
        return words
        
    # Standard greedy line-wrapping for three or more words
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        w_test = draw.textbbox((0, 0), test_line, font=font)[2]
        if w_test <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(word)
    if current_line:
        lines.append(' '.join(current_line))
    return lines

def generate_player_badge(full_name, member_id, bg_img, output_path, names_output_path, frame_output_path):
    parts = full_name.split(' ', 1)
    line1 = parts[0]
    line2 = parts[1] if len(parts) > 1 else ''
    
    logo_path = find_player_logo(full_name)
    theme_color = get_player_theme_color(full_name, logo_path)
    tinted_bg = apply_color_tint(bg_img, theme_color)
    
    canvas_w = bg_img.width * SCALE
    canvas_h = bg_img.height * SCALE
    safe_w = canvas_w - 100 * SCALE
    
    # Combined canvases
    colored_layers = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    combined_black_mask = Image.new('L', (canvas_w, canvas_h), 0)
    
    # 1. Render First Name (Line 1) at FONT_SIZE_FIRST
    line1_img, black_mask1 = render_name_layer_rotated(line1, FONT_PATH_SCRIPT, FONT_SIZE_FIRST, 160, 12, canvas_w, canvas_h, theme_color)
    combined_black_mask.paste(black_mask1, (0, 0), black_mask1)
    colored_layers.paste(line1_img, (0, 0), mask=line1_img)
    
    # 2. Render Last Name (Line 2) at FONT_SIZE_LAST
    if line2:
        font_last = ImageFont.truetype(FONT_PATH_SCRIPT, FONT_SIZE_LAST)
        wrapped_lines = wrap_text(line2, font_last, safe_w)
        
        if len(wrapped_lines) == 1:
            # Render last name on a single line with bottom aligned at Y=914 (2px above 916 plaque top)
            line2_img, black_mask2 = render_name_layer_rotated(line2, FONT_PATH_SCRIPT, FONT_SIZE_LAST, 0, 12, canvas_w, canvas_h, theme_color, bottom_y=914)
            combined_black_mask.paste(black_mask2, (0, 0), black_mask2)
            colored_layers.paste(line2_img, (0, 0), mask=line2_img)
        else:
            # Render last name on two lines with bottom of second line at Y=914 and first line at Y=834
            bottom_ys = [834, 914]
            for idx, text_line in enumerate(wrapped_lines[:2]):
                line_img, mask_img = render_name_layer_rotated(text_line, FONT_PATH_SCRIPT, FONT_SIZE_LAST, 0, 12, canvas_w, canvas_h, theme_color, bottom_y=bottom_ys[idx])
                combined_black_mask.paste(mask_img, (0, 0), mask_img)
                colored_layers.paste(line_img, (0, 0), mask=line_img)
                
    # Soft drop shadow under the black outlines
    shadow_offset_x = int(5 * SCALE)
    shadow_offset_y = int(7 * SCALE)
    shadow_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_fill = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 160))
    shadow_layer.paste(shadow_fill, (0, 0), mask=combined_black_mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=3 * SCALE))
    
    # Assemble names high-res image
    names_canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    names_canvas.paste(shadow_layer, (shadow_offset_x, shadow_offset_y), mask=shadow_layer)
    names_canvas.paste(colored_layers, (0, 0), mask=colored_layers)
    
    # Downsample name layer to 1x and composite onto background
    names_img_1x = names_canvas.resize((bg_img.width, bg_img.height), Image.Resampling.LANCZOS)
    names_img_1x.save(names_output_path)
    
    # Save the frame (background card) - plaque is pre-printed on the card template
    frame_img = tinted_bg
    draw = ImageDraw.Draw(frame_img)
    
    if full_name.lower().strip() == "derek allen":
        plaque_text = "TOURNAMENT DIRECTOR"
        font_plaque = ImageFont.truetype(FONT_PATH_SERIF, 20)
        text_color = (235, 235, 240, 255)
    else:
        plaque_text = f"MEMBER #{member_id}"
        font_plaque = ImageFont.truetype(FONT_PATH_SERIF, 26)
        text_color = (255, 230, 110, 255)
        
    p_bbox = draw.textbbox((0, 0), plaque_text, font=font_plaque)
    p_w = p_bbox[2] - p_bbox[0]
    p_h = p_bbox[3] - p_bbox[1]
    
    tx = (frame_img.width - p_w) // 2
    ty = 916 + (72 - p_h) // 2 - p_bbox[1]
    
    # Draw plaque text
    draw.text((tx, ty), plaque_text, font=font_plaque, fill=text_color)
    frame_img.save(frame_output_path)
    
    # Create full composite card
    card_img = frame_img.copy()
    
    # If the player has a custom logo, crop, resize, feather and paste it onto card_img first
    logo_path = find_player_logo(full_name)
    if logo_path:
        try:
            logo_img = Image.open(logo_path).convert('RGBA')
            logo_resized = logo_img.resize((470, 470), Image.Resampling.LANCZOS)
            
            # Create rounded rectangle feathered mask
            mask = Image.new('L', (470, 470), 0)
            draw_m = ImageDraw.Draw(mask)
            draw_m.rounded_rectangle([10, 10, 460, 460], radius=40, fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(15))
            
            # Combine alpha channels if logo has alpha, else just use mask
            if 'A' in logo_resized.mode:
                logo_alpha = logo_resized.split()[3]
                combined_mask = ImageChops.multiply(logo_alpha, mask)
            else:
                combined_mask = mask
                
            # Center the logo vertically in the blank middle space
            px = (card_img.width - 470) // 2
            py = 250
            card_img.paste(logo_resized, (px, py), mask=combined_mask)
        except Exception as e:
            print(f"  Warning: failed to paste logo for {full_name}: {e}")
            
    # Paste names on top of logo
    card_img.paste(names_img_1x, (0, 0), mask=names_img_1x)
    card_img.save(output_path)
    

def main():
    print("Starting mockup-aligned badge layer generation...")
    full_dir = os.path.join(OUTPUT_DIR, "full")
    names_dir = os.path.join(OUTPUT_DIR, "names")
    frames_dir = os.path.join(OUTPUT_DIR, "frames")
    
    os.makedirs(full_dir, exist_ok=True)
    os.makedirs(names_dir, exist_ok=True)
    os.makedirs(frames_dir, exist_ok=True)
    
    bg_img = Image.open(BG_PATH)
    
    total = len(PLAYERS_MAP)
    for i, (name, member_id) in enumerate(PLAYERS_MAP.items(), 1):
        filename = sanitize_filename(name)
        out_path = os.path.join(full_dir, f"badge_{filename}")
        names_path = os.path.join(names_dir, f"names_{filename}")
        frame_path = os.path.join(frames_dir, f"frame_{filename}")
        
        # Mappings are strictly pulled from the user-confirmed table in PLAYERS_MAP
        # (e.g. Derek Allen = 101, Berta Allen = 102, Abbi Sweet = 163, Guy Vider = 168)
        
        try:
            generate_player_badge(name, member_id, bg_img, out_path, names_path, frame_path)
            print(f"[{i}/{total}] Generated layers for \"{name}\" with Member #{member_id}")
        except Exception as e:
            print(f"[{i}/{total}] Failed to generate layers for \"{name}\": {e}")
            
    print("All player name badge layers generated successfully!")

if __name__ == '__main__':
    main()
