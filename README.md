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
