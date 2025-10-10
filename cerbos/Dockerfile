FROM ghcr.io/cerbos/cerbos:latest

# Copy policies and configuration
COPY policies /policies
COPY config.yaml /config.yaml

# Expose ports
EXPOSE 3592 3593

# Run Cerbos with our configuration
CMD ["server", "--config=/config.yaml"]
