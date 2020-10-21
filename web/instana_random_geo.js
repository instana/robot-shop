var items = [
    // white house
    "156.33.241.5",
    // Hollywood
    "34.196.93.245",
    // Chicago
    "98.142.103.241",
    // Los Angeles
    "192.241.230.151",
    // Europe
    "34.105.212.119"
];

// we get a random ip address to simulate specific locations of the requester
function get(r) {
    if (process.env.NGINX_INJECT_FAKE_IP != '1') {
        return false;
    }

    return items[Math.floor(Math.random() * items.length)];
}

export default get;
