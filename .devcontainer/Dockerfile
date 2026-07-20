# Starting image
FROM debian:stable-20230919-slim

###### SETUP ##################################################################################
# Install zsh first (needed before creating user with zsh as default shell)
RUN apt update && apt install -y zsh

# Set up new user
ARG LINUX_USER_NAME=dev
RUN useradd -ms /bin/zsh $LINUX_USER_NAME
WORKDIR /home/$LINUX_USER_NAME

###### INSTALL SOFTWARE AS ROOT #################################################################################
USER root

# Prerequisites
RUN apt update && apt install -y curl git yq vim lsof procps ca-certificates nodejs npm

# Docsify CLI (local docs site: docsify serve)
RUN npm install -g docsify-cli

# Install a Chromium-based browser for Markdown Preview Enhanced PDF export
# Google Chrome only ships amd64 packages; use Chromium on arm64 (Apple Silicon Macs)
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates fonts-liberation fonts-noto-color-emoji xdg-utils && \
    ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        apt-get install -y libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 \
            libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libxcomposite1 \
            libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 && \
        wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg && \
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
        apt-get update && \
        apt-get install -y google-chrome-stable; \
    elif [ "$ARCH" = "arm64" ]; then \
        apt-get install -y chromium; \
    fi && \
    rm -rf /var/lib/apt/lists/*

# Create a wrapper script for the browser to run in container (headless mode for PDF export)
# MPE/Puppeteer will add --headless, but we ensure container flags are always present
# This wrapper auto-detects the correct binary (Chrome on amd64, Chromium on arm64)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        CHROME_BIN="/usr/bin/google-chrome-stable"; \
    else \
        CHROME_BIN="/usr/bin/chromium"; \
    fi && \
    printf '#!/bin/bash\nexec %s \\\n\
  --no-sandbox \\\n\
  --disable-setuid-sandbox \\\n\
  --disable-dev-shm-usage \\\n\
  --disable-gpu \\\n\
  --disable-software-rasterizer \\\n\
  --disable-extensions \\\n\
  --disable-background-networking \\\n\
  --disable-background-timer-throttling \\\n\
  --disable-renderer-backgrounding \\\n\
  --disable-backgrounding-occluded-windows \\\n\
  --disable-ipc-flooding-protection \\\n\
  "$@"\n' "$CHROME_BIN" > /usr/local/bin/google-chrome && \
    chmod +x /usr/local/bin/google-chrome && \
    /usr/local/bin/google-chrome --version || true

###### INSTALL SOFTWARE AS DEV #################################################################################
USER $LINUX_USER_NAME

# oh-my-zsh setup
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended && \
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k && \
    git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autosuggestions && \
    git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting && \
    sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="powerlevel10k\/powerlevel10k"/' ~/.zshrc && \
    sed -i 's/^plugins=(git)/plugins=(git docker kubectl helm colored-man-pages command-not-found extract history-substring-search zsh-autosuggestions zsh-syntax-highlighting)/' ~/.zshrc

###### CLOSING ##################################################################################
USER $LINUX_USER_NAME
ENV PROJECT_ROOT=/home/dev/workspace

# Clean up any Windows carriage returns to avoid errors in Windows
RUN printf 'temp_file=$(mktemp) && tr -d "\\r" < "${PROJECT_ROOT}/.devcontainer/aliases" > "$temp_file" && mv -f "$temp_file" "${PROJECT_ROOT}/.devcontainer/aliases"\n' >> ~/.zshrc

RUN printf 'for file in "${PROJECT_ROOT}"/scripts/*.sh; do \n\
    temp_file=$(mktemp) && tr -d "\\r" < "$file" > "$temp_file" && mv -f "$temp_file" "$file"; \n\
    done\n' >> ~/.zshrc

# Ensure scripts are executable
RUN echo 'chmod +x ${PROJECT_ROOT}/scripts/*.sh' >> ~/.zshrc

# Source aliases and functions, then zsh config
RUN echo "# Source aliases and functions" >> ~/.zshrc && \
    echo "source ${PROJECT_ROOT}/.devcontainer/aliases" >> ~/.zshrc && \
    echo "source ${PROJECT_ROOT}/scripts/functions.sh" >> ~/.zshrc && \
    echo "# Source zsh configuration (p10k, history, cursor, etc.)" >> ~/.zshrc && \
    echo "source ${PROJECT_ROOT}/.devcontainer/zsh-config.zsh" >> ~/.zshrc

# Configure workspace as safe directory for git
RUN git config --global --add safe.directory ${PROJECT_ROOT}

# Clean up
USER root
RUN apt-get clean
RUN rm -Rf /tmp/* && rm -Rf /var/lib/apt/lists/*
USER $LINUX_USER_NAME
