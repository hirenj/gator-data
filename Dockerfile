FROM	ubuntu:trusty

RUN		apt-get update --fix-missing
RUN 	apt-get install -y nodejs curl npm
RUN     ln -s /usr/bin/nodejs /usr/bin/node
RUN 	curl -LO 'https://github.com/hirenj/gator-data/archive/snpviewer.tar.gz'
RUN     tar -zxvf snpviewer.tar.gz
RUN     mkdir -p /var/ && mv gator-data-snpviewer /var/gator-data
RUN     cd /var/gator-data; npm install

EXPOSE  3000

CMD		["/usr/bin/node", "/var/gator-data/bin/gatordata-httpd"]
