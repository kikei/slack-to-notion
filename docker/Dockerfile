FROM amazon/aws-cli

# To install Node.js with nvm later
RUN yum -y install glibc gzip tar \
  && yum -y clean all \
  && rm -rf /var/cache

# Install Node.js 16
#RUN curl -fsSL https://rpm.nodesource.com/setup_19.x | bash - \
#  && yum update -y \
#  && yum install -y nodejs \
#  && npm install -g npm@latest

RUN mkdir -m 0777 /home/worker
