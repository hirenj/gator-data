# DOCKER-VERSION 0.3.4

FROM	ubuntu:quantal

RUN		apt-get update
RUN		apt-get install -y python-software-properties python g++ make rlwrap sqlite3
RUN		apt-get install -y software-properties-common
RUN		add-apt-repository ppa:chris-lea/node.js
RUN		apt-get update
RUN		apt-get install nodejs

ADD 	. /srv/gatordata
RUN		cd /srv/gatordata; npm install

EXPOSE	3000
RUN 	rm -f /srv/gatordata/cached.db; touch /srv/gatordata/cached.db
RUN     cd /srv/gatordata; cat bootstrap.js | bin/gatordata-httpd
CMD [ "/srv/gatordata/bin/gatordata-httpd"]