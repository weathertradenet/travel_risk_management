from pathlib import Path
import re

base = Path(__file__).parent

index_html = (base / "index.html").read_text(encoding="utf-8")
styles_css = (base / "css" / "styles.css").read_text(encoding="utf-8")
app_js = (base / "js" / "app.js").read_text(encoding="utf-8")

# Inline local CSS: css/styles.css
index_html = re.sub(
    r'<link[^>]+href=["\']css/styles\.css["\'][^>]*>',
    f"<style>\n{styles_css}\n</style>",
    index_html
)

# Inline local JS: js/app.js
index_html = re.sub(
    r'<script[^>]+src=["\']js/app\.js["\'][^>]*></script>',
    f"<script>\n{app_js}\n</script>",
    index_html
)

out_file = base / "travel_planner_standalone.html"
out_file.write_text(index_html, encoding="utf-8")

print("Created:", out_file)