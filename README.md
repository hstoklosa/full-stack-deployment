# full-stack-deployment

## server setup

ssh into the server

```bash
ssh <username>@<server-ip>
```

add a new user account

```bash
adduser <username>
```

ensure this user has sudo permissions

```bash
usermod -aG sudo <username>
```

switch to the new user

```bash
su - <username>
```

### recover from lost ssh connection

you can install tmux on vps to work inside of it. if the ssh connection is lost, you can reattach to the session.

```bash
sudo apt-get install tmux
```

## domain setup

go to dns records and clear the A and CNAME records for the domain

add a new A record for the root domain pointing this to the ip address of the server

check if the dns record has propagated to the internet

```bash
nslookup <domain-name>
```

if the dns record is found, you can use the domain name to access the server

```bash
ssh <username>@<domain-name>
```

## ssh hardening (more security)

ensure non-root user has a copy of the ssh public key

from your local machine:

```bash
ssh-copy-id -i ~/.ssh/<key-name>.pub <username>@<server-ip>
```

disable password authentication on the server

```bash
sudo vi /etc/ssh/sshd_config
```

change the following line:

- `PasswordAuthentication yes` to `PasswordAuthentication no`

other recommendations to harden ssh security:

- `PermitRootLogin yes` to `PermitRootLogin no`
- `UsePAM yes` to `UsePAM no`

reload the changes

```bash
sudo systemctl reload ssh
```

## app running

instead of running application binary directly, instead we can run it using docker through an image.

containerization allows to build an immutable image of the app for distribution.

- immutable
- versioned
- configurable

install docker and docker compose onto the vps.

https://docs.docker.com/engine/install/ubuntu/

once installed, add user to the docker group to avoid using sudo when interfacing with docker.

```bash
sudo usermod -aG docker <username>
```

### app containerisation

#### development

`frontend/Dockerfile`

```bash
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

Vite's dev server binds `localhost` inside the container, which is not accessible from the host machine.

to fix this, we tell Vite to listen on `0.0.0.0` (all network interfaces) so it is accessible from outside the container.

modify `frontend/vite.config.ts` to include the following:

```ts
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
        usePolling: true,
    }
  }
```

`backend/Dockerfile`

```bash
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt /app

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./app /app/app

CMD ["fastapi", "dev", "--host", "0.0.0.0", "--reload", "app/main.py"]
```

`docker-compose.yml`

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - 5173:5173
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend:/app # create 2-way sync between local code and container code
      - /app/node_modules # create anonymous volume to avoid overwriting container node_modules
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - 8000:8000
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/fs-deployment
    volumes:
      - ./backend/app:/app/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=fs-deployment
    ports:
      - 5432:5432
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

`volumes` in `frontend` service allows for hot-reloading of changes to the web app.

#### production

todo

## firewall

basic ports that should be enabled:

- 22: ssh
- 80: http
- 443: https

to achieve this, we can use the uncomplicated firewall `ufw` application (comes pre-installed on ubuntu).

### defining firewall rules

disable all inbound network requests and enable all outbound network requests by default:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

enable ssh (must be done to access the server again)

```bash
sudo ufw allow OpenSSH
sudo ufw allow http
sudo ufw allow https
```

enable the firewall:

```bash
sudo ufw enable
```

check that the firewall was configured correctly:

```bash
sudo ufw show added
```

the firewall should be up and running:

```bash
sudo ufw status
```

however, the app can still be accessesible from a port that hasn't been explicitly allowed.

this is caused by exposing the port with docker, which overrides the ip tables rules defined by ufw (well-known issue).

to fix this, we can simply not define the ports within `docker-compose.yml` and use a reverse proxy, which is what will be exposed to the internet.

## reverse proxy

to begin setting up a reverse proxy with traefik, we need it to listen on port 80, forwarding any HTTP requests with <domain-name> host header to the appropriate service.

adding traefik to the stack requires a new service to be added to the `docker-compose.yml` file:

```yaml
services:
  proxy:
    image: traefik:v3.1
    command:
      - "--api.insecure=true"
      - "--providers.docker"
    ports:
      # The HTTP Port
      - 80:80
      # The WebUI UI (enabled by --api.insecure=true)
      - 8080:8080
    volumes:
      # So that Traefik can listen to docker events
      - /var/run/docker.sock:/var/run/docker.sock
```

add used ports to the firewall allowlist

```bash
sudo ufw allow 80
sudo ufw allow 8080
```

traefik web ui dashboard: `http://<server-ip>:8080`

set up so that HTTP requests are forwarded to the appropriate service.

add labels to the services (frontend, backend...)

````yaml
labels:
  - "traefik.enable=true"
  # Route any HTTP requests that contain the host to this service
  - "traefik.http.routers.frontend.rule=Host(`deploy.hstoklosa.dev`)"


### Other

```bash
sudo ufw allow 80
sudo ufw allow 443
````

create a new network for the proxy to use:

```bash
docker network create proxy
```

add the proxy network to the `traefik/docker-compose.yml` file:

```yaml
networks:
  proxy:
    external: true
```

## load balancing

when you scale up the number of instances of a service,

```yaml
docker compose scale backend=3
```

traefik will automatically load balance the requests between the instances.

having a load balancer on a single node (doesn't improve performance) improves reliability of the service through increased availability.

this scaling can be persistent by adding a `replica` block to the `docker-compose.yml` file:

```yaml
deploy:
  mode: replicated
  replicas: 3
```

## tls + https

basic intro: https://howhttps.works/
