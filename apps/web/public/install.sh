#!/bin/sh
# Voquill CLI installer
#
# Usage:
#   curl -fsSL https://voquill.com/install.sh | sh
#   curl -fsSL https://voquill.com/install.sh | sh -s -- --dev
#   curl -fsSL https://voquill.com/install.sh | sh -s -- --version 1.2.3

set -eu

REPO="voquill/voquill"
BIN_NAME="voquill"
CHANNEL="prod"
VERSION=""

while [ $# -gt 0 ]; do
	case "$1" in
		--dev)
			BIN_NAME="voquill-dev"
			CHANNEL="dev"
			shift
			;;
		--version)
			VERSION="${2:-}"
			if [ -z "$VERSION" ]; then
				echo "error: --version requires an argument" >&2
				exit 1
			fi
			shift 2
			;;
		-h|--help)
			cat <<EOF
Voquill CLI installer

Options:
  --dev             Install voquill-dev (targets dev backend) instead of voquill
  --version X.Y.Z   Install a specific version (defaults to latest release)
  -h, --help        Show this help
EOF
			exit 0
			;;
		*)
			echo "error: unknown argument '$1'" >&2
			exit 1
			;;
	esac
done

uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "$uname_s" in
	Darwin) os_target="apple-darwin" ;;
	Linux)  os_target="unknown-linux-gnu" ;;
	*)
		echo "error: unsupported OS '$uname_s'" >&2
		exit 1
		;;
esac

case "$uname_m" in
	x86_64|amd64)  arch_target="x86_64" ;;
	arm64|aarch64) arch_target="aarch64" ;;
	*)
		echo "error: unsupported architecture '$uname_m'" >&2
		exit 1
		;;
esac

target="${arch_target}-${os_target}"

# Resolve release tag
if [ -n "$VERSION" ]; then
	if [ "$CHANNEL" = "prod" ]; then
		tag="cli-v${VERSION}"
	else
		tag="cli-dev-v${VERSION}"
	fi
else
	api_url="https://api.github.com/repos/${REPO}/releases"
	if [ "$CHANNEL" = "prod" ]; then
		prefix="cli-v"
	else
		prefix="cli-dev-v"
	fi
	# Scan releases for the first tag matching our prefix. Works for both
	# prod (non-prerelease cli-v*) and dev (prerelease cli-dev-v*).
	tag="$(curl -fsSL "$api_url" \
		| grep -o "\"tag_name\": *\"${prefix}[0-9.]*\"" \
		| head -1 \
		| sed 's/.*"\(.*\)".*/\1/')"
fi

if [ -z "${tag:-}" ]; then
	echo "error: could not resolve a ${CHANNEL} release tag" >&2
	exit 1
fi

asset="${BIN_NAME}-${target}.tar.gz"
url="https://github.com/${REPO}/releases/download/${tag}/${asset}"

install_dir="${VOQUILL_INSTALL:-$HOME/.voquill}"
bin_dir="${install_dir}/bin"
mkdir -p "$bin_dir"

echo "Downloading $url"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if ! curl -fsSL "$url" -o "$tmp/$asset"; then
	echo "error: failed to download $url" >&2
	exit 1
fi

tar -xzf "$tmp/$asset" -C "$tmp"

extracted="$tmp/${BIN_NAME}-${target}/${BIN_NAME}"
if [ ! -f "$extracted" ]; then
	echo "error: binary not found inside archive at $extracted" >&2
	ls -la "$tmp" >&2
	exit 1
fi

mv "$extracted" "$bin_dir/$BIN_NAME"
chmod +x "$bin_dir/$BIN_NAME"

echo
echo "✓ Installed $BIN_NAME $tag to $bin_dir/$BIN_NAME"

# Make sure bin_dir is on PATH in the user's shell profile.
case ":${PATH}:" in
	*":${bin_dir}:"*)
		already_on_path=1
		;;
	*)
		already_on_path=0
		;;
esac

profile=""
shell_name="$(basename "${SHELL:-}")"
case "$shell_name" in
	zsh)
		profile="${ZDOTDIR:-$HOME}/.zshrc"
		export_line="export PATH=\"${bin_dir}:\$PATH\""
		;;
	bash)
		if [ -f "$HOME/.bashrc" ]; then
			profile="$HOME/.bashrc"
		else
			profile="$HOME/.bash_profile"
		fi
		export_line="export PATH=\"${bin_dir}:\$PATH\""
		;;
	fish)
		profile="$HOME/.config/fish/config.fish"
		export_line="fish_add_path ${bin_dir}"
		;;
	*)
		profile=""
		export_line="export PATH=\"${bin_dir}:\$PATH\""
		;;
esac

if [ -n "$profile" ]; then
	mkdir -p "$(dirname "$profile")"
	touch "$profile"
	if ! grep -Fq "$bin_dir" "$profile"; then
		printf '\n# Voquill CLI\n%s\n' "$export_line" >> "$profile"
		echo "Added $bin_dir to PATH in $profile"
		already_on_path=0
	fi
fi

if [ "$already_on_path" = "0" ]; then
	echo
	echo "$bin_dir is not on your PATH in this shell."
	if [ -n "$profile" ]; then
		echo "Start a new terminal, or run this now to use $BIN_NAME immediately:"
		case "$shell_name" in
			fish)
				echo "  source $profile"
				;;
			*)
				echo "  . $profile"
				;;
		esac
	else
		echo "Add this line to your shell profile (and run it now to use $BIN_NAME immediately):"
		echo "  $export_line"
	fi
fi
