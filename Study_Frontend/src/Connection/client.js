import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:4000/",
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
