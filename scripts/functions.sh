#!/usr/bin/env zsh
# Minimal subset of Helm scripts/functions.sh — only what .devcontainer/zsh-config.zsh needs.

#region Setup
logs_dir="$HOME/.logs"
mkdir -p "$logs_dir"
setopt KSH_ARRAYS
#endregion

export_terminal_colors() {
  if command -v tput >/dev/null 2>&1 && tput setaf 1 >/dev/null 2>&1; then
    export BLACK=$(tput setaf 0)
    export RED=$(tput setaf 1)
    export GREEN=$(tput setaf 2)
    export YELLOW=$(tput setaf 3)
    export BLUE=$(tput setaf 4)
    export MAGENTA=$(tput setaf 5)
    export CYAN=$(tput setaf 6)
    export WHITE=$(tput setaf 7)
    export B_BLACK=$(tput setab 0)
    export B_RED=$(tput setab 1)
    export B_GREEN=$(tput setab 2)
    export B_YELLOW=$(tput setab 3)
    export B_BLUE=$(tput setab 4)
    export B_MAGENTA=$(tput setab 5)
    export B_CYAN=$(tput setab 6)
    export B_WHITE=$(tput setab 7)
    export RESET=$(tput sgr0)
  else
    export BLACK=$'\033[30m'
    export RED=$'\033[31m'
    export GREEN=$'\033[32m'
    export YELLOW=$'\033[33m'
    export BLUE=$'\033[34m'
    export MAGENTA=$'\033[35m'
    export CYAN=$'\033[36m'
    export WHITE=$'\033[37m'
    export B_BLACK=$'\033[40m'
    export B_RED=$'\033[41m'
    export B_GREEN=$'\033[42m'
    export B_YELLOW=$'\033[43m'
    export B_BLUE=$'\033[44m'
    export B_MAGENTA=$'\033[45m'
    export B_CYAN=$'\033[46m'
    export B_WHITE=$'\033[47m'
    export RESET=$'\033[0m'
  fi
}
