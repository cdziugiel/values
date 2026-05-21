FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

RUN apt-get update && apt-get install -y \
    fonts-dejavu \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-liberation \
    fontconfig \
  && fc-cache -f -v \
  && rm -rf /var/lib/apt/lists/*