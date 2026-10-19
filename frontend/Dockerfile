FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Copy compiled frontend SPA bundle
COPY --from=build /app/dist /usr/share/nginx/html

# Install custom hardened Nginx configuration with load balancing, caching & SPA rewrites
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Load balancer health probe
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/lb-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
