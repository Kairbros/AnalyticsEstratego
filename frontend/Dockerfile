FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL se puede pasar de dos formas:
#  1) Como build-arg (--build-arg VITE_API_URL=...).
#  2) Como env var normal del servicio (EasyPanel la inyecta al build).
# Tomamos el build-arg con valor por defecto vacío; si EasyPanel pone una
# env var con el mismo nombre, Vite igual la lee porque se exporta a ENV.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
