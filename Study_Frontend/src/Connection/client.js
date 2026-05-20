import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://site-network-management.onrender.com/",
    headers: {
      get authorization() {
        const token = sessionStorage.getItem("token");
        return token ? `Bearer ${token}` : "";
      },
    },
  }),
  cache: new InMemoryCache(),
});

export default client;
