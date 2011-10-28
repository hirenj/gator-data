# Setup and installation

First of all, make a clone or [fork of this repository](http://help.github.com/fork-a-repo/) and replace all occurrences of `snpviewer` with a name of your choice.

## Launch an EC2 instance

[Start a "micro" Amazon EC2 instance](https://console.aws.amazon.com/ec2/home) and use one of the following AMIs, depending on where you chose to launch it:

- US west: `ami-ad7e2ee8`
- US east: `ami-ccf405a5`
- EU west: `ami-fb9ca98f`
- Asia Pacific (Singapore): `ami-0c423c5e`

> These AMIs where taken from <http://uec-images.ubuntu.com/releases/10.10/release/>

Go with the defaults in the "wizard" presented. Chose to create a new key pair when asked and **be sure to make a secure backup of the private key** that you will download. A good place to put your private key is in `~/.ssh/snpviewer.pem` and then `chmod 0600 ~/.ssh/snpviewer.pem` so no one else can read it but you.

When the instance is green and "started", log in to the machine:

    ssh -i ~/.ssh/snpviewer.pem ubuntu@XXX.amazonaws.com

*Note: Replace `XXX.amazonaws.com` with the hostname or address of your instance.*

*Note: If you are running Microsoft Windows, which lacks an SSH client, see [WINDOWS-SSH.md](WINDOWS-SSH.md#readme)*.

## Install software

    sudo apt-get update
    sudo apt-get install nginx git-core daemon
    sudo chown www-data:www-data /var/www
    sudo chown -R www-data:www-data /var/www

Node.js:

    sudo apt-get install build-essential libssl-dev
    cd
    mkdir src
    git clone https://github.com/joyent/node.git src/node
    cd src/node
    git checkout v0.4.11
    ./configure
    JOBS=2 make
    sudo make install

NPM:

    sudo true && curl http://npmjs.org/install.sh | sudo sh

## Checkout your source

    sudo mkdir /var/snpviewer
    sudo chown www-data:www-data /var/snpviewer

If your git repository is public (i.e. viewable by anyone):

    sudo -Hu www-data git clone https://hirenj@github.com/hirenj/gator-data.git --branch snpviewer /var/snpviewer
    
    cd /var/snpviewer
        
    sudo -Hu www-data npm install

    sudo apt-get install sqlite3

    sudo -Hu www-data sqlite3 cached.db "select *"

## Configure & start your services

Your Node.js web server:

    sudo ln -s /var/snpviewer/init.d/gatordata-httpd /etc/init.d/snpviewer-httpd
    sudo update-rc.d snpviewer-httpd defaults
    sudo invoke-rc.d snpviewer-httpd start
    
Optional `snpviewer-processor`:
    
    sudo ln -s /var/snpviewer/init.d/gatordata-processor /etc/init.d/snpviewer-processor
    sudo update-rc.d snpviewer-processor defaults
    sudo invoke-rc.d snpviewer-processor start


## Configure Nginx

There are three different kinds of setups to chose from:

1. `gatordata-http` -- HTTP only
2. `gatordata-https` -- HTTPS with HTTP redirecting to HTTPS
3. `gatordata-https-http` -- HTTPS and HTTP

If you are using HTTPS, make sure you have added your SSL certificate and key at `/var/snpviewer/ssl/ssl.crt` and `/var/snpviewer/ssl/ssl.key`.

Replace `gatordata-https` below with the configuration of your choice:

    sudo ln -sf /var/snpviewer/etc/nginx/sites-available/gatordata-https \
                /etc/nginx/sites-enabled/snpviewer-https
    sudo invoke-rc.d nginx restart


## Done

Your web app should now be operational.

Note that the programs `snpviewer-httpd` and `snpviewer-processor` are written in the Move programming language (like JavaScript but simpler). [Learn more at movelang.org](http://movelang.org/).

If everything works, **continue by reading [WORKFLOW.md](https://github.com/hirenj/gator-data/blob/master/WORKFLOW.md#readme)**
