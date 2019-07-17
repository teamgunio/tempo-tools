FROM node:dubnium

ENV WORKDIR /var/lib/gunio
RUN mkdir -p $WORKDIR
WORKDIR ${WORKDIR}

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY dist dist

RUN npm install --production

CMD ["npm", "run", "serve"]
