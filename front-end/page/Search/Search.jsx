import Header from "../../components/Header/Header";
import { useUser } from "../../context/UserContext";
function Search() {
  const { user } = useUser();
  return <Header bgURL={user?.backGroundImg} />;
}
export default Search;
