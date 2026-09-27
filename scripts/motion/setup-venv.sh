#!/usr/bin/env bash
#
# Idempotent setup for the offline cinematic-clip renderer venv.
#
# Creates .motion-venv/ at the repository root (gitignored) and installs
# the pinned renderer from scripts/motion/requirements.txt. Safe to run
# repeatedly: an existing venv with the pinned version is left untouched,
# and every bootstrap step checks its own output before doing work.
#
# The renderer's C extension (and the text-shaping library behind it)
# build against cairo and pango. When the machine has no system-wide
# -dev packages and no sudo, this script bootstraps a private toolchain
# under ~/.clip-toolchain by downloading the distribution's own -dev
# packages and extracting them locally (never installing anything
# system-wide): pkg-config plus the cairo/pango/glib header and .pc
# files, with the .so dev links pointed at the system's runtime
# libraries. The private cairo headers have the X11 surface features
# turned off, so the extension builds without any X headers; the text
# shaping library is built the same way through its own no-x11 option.
#
# The venv lives on the machine that renders clips, never on the
# deployment platform: no build step invokes it (pinned by
# tests/unit/motion-clip-build-isolation.test.ts).
#
#   bash scripts/motion/setup-venv.sh        (or: npm run clips:venv)
set -euo pipefail

cd "$(dirname "$0")/../.."

VENV_DIR=".motion-venv"
PINNED_VERSION="$(sed -n 's/^manim==//p' scripts/motion/requirements.txt)"
TOOLCHAIN="${CLIP_TOOLCHAIN_DIR:-$HOME/.clip-toolchain}"
PREFIX="$TOOLCHAIN/prefix/usr"

log() { echo "[clip-venv] $*"; }

# ---------------------------------------------------------------------------
# 1. Fast path: the venv already holds the pinned renderer.
# ---------------------------------------------------------------------------
if [ -x "$VENV_DIR/bin/python" ]; then
  installed="$("$VENV_DIR/bin/python" -c 'import manim; print(manim.__version__)' 2>/dev/null || true)"
  if [ "$installed" = "$PINNED_VERSION" ]; then
    log "ready: $VENV_DIR (renderer $installed, pinned $PINNED_VERSION)"
    exit 0
  fi
fi

# ---------------------------------------------------------------------------
# 2. Does this machine already provide a usable pkg-config + cairo build?
#    (System -dev packages or an earlier run of this script both count.)
# ---------------------------------------------------------------------------
have_system_build() {
  command -v pkg-config >/dev/null 2>&1 && pkg-config --exists cairo pango
}
need_toolchain=1
if have_system_build; then
  need_toolchain=0
fi

if [ "$need_toolchain" = 1 ] && [ ! -x "$PREFIX/bin/pkg-config" ]; then
  log "bootstrapping a private pkg-config + cairo/pango toolchain in $TOOLCHAIN"
  mkdir -p "$TOOLCHAIN"
  cd "$TOOLCHAIN"
  # shellcheck disable=SC2016
  apt-get download \
    pkg-config pkgconf pkgconf-bin libpkgconf3 \
    libcairo2-dev \
    libpango1.0-dev libglib2.0-dev libharfbuzz-dev libthai-dev \
    libfontconfig-dev libfreetype-dev libpng-dev libffi-dev \
    libpcre2-dev libbrotli-dev libgraphite2-dev libbz2-dev libzstd-dev \
    zlib1g-dev libexpat1-dev libdatrie-dev libsepol-dev \
    libblkid-dev libmount-dev libselinux1-dev
  mkdir -p prefix
  for deb in ./*.deb; do dpkg-deb -x "$deb" prefix/; done
  cd - >/dev/null
fi

if [ "$need_toolchain" = 1 ]; then
  export PATH="$PREFIX/bin:$PATH"
  export PKG_CONFIG_PATH="$PREFIX/lib/x86_64-linux-gnu/pkgconfig:$PREFIX/share/pkgconfig"
  export LD_LIBRARY_PATH="$PREFIX/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  # The extracted .pc files hardcode prefix=/usr; repoint them at the
  # local prefix, drop Requires.private chains (only needed for static
  # linking, and they would drag in the whole X stack), and repair the
  # .so dev links to point at the system's runtime libraries.
  find "$PREFIX" -name '*.pc' -type f | xargs --no-run-if-empty sed -i \
    -e "s|^prefix=/usr\$|prefix=$PREFIX|" \
    -e "s|^exec_prefix=/usr\$|exec_prefix=$PREFIX|" \
    -e '/^Requires\.private/d'
  find "$PREFIX" -name '*.so' -type l | while read -r link; do
    target="$(readlink "$link")"
    if [ ! -e "$link" ] && [ -e "/lib/x86_64-linux-gnu/$target" ]; then
      ln -sf "/lib/x86_64-linux-gnu/$target" "$link"
    fi
  done
  # pycairo compiles fine without the X11 surface backends; the shipped
  # cairo-features.h still *defines* the macros (defined() is true even
  # at 0), so set them to 0 for cairo.h's own value-tested guards.
  sed -i \
    -e 's/^#define CAIRO_HAS_XCB_SHM_FUNCTIONS 1/#define CAIRO_HAS_XCB_SHM_FUNCTIONS 0/' \
    -e 's/^#define CAIRO_HAS_XCB_SURFACE 1/#define CAIRO_HAS_XCB_SURFACE 0/' \
    -e 's/^#define CAIRO_HAS_XLIB_SURFACE 1/#define CAIRO_HAS_XLIB_SURFACE 0/' \
    -e 's/^#define CAIRO_HAS_XLIB_XRENDER_SURFACE 1/#define CAIRO_HAS_XLIB_XRENDER_SURFACE 0/' \
    "$PREFIX/include/cairo/cairo-features.h"
fi

# ---------------------------------------------------------------------------
# 3. The venv itself.
# ---------------------------------------------------------------------------
if [ ! -x "$VENV_DIR/bin/python" ]; then
  log "creating $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

log "installing the pinned renderer (this can take a few minutes)"
"$VENV_DIR/bin/python" -m pip install --quiet --upgrade pip
if [ "$need_toolchain" = 1 ]; then
  # pycairo: build against the private toolchain with X11 surfaces off.
  "$VENV_DIR/bin/python" -m pip install --quiet pycairo \
    --config-settings=setup-args=-Dno-x11=true
fi
"$VENV_DIR/bin/python" -m pip install --quiet -r scripts/motion/requirements.txt

installed="$("$VENV_DIR/bin/python" -c 'import manim; print(manim.__version__)')"
if [ "$installed" != "$PINNED_VERSION" ]; then
  log "ERROR: renderer version $installed does not match pin $PINNED_VERSION" >&2
  exit 1
fi
log "ready: $VENV_DIR (renderer $installed)"
