pragma solidity 0.5.8;


contract Githereum {
  struct Repo {
    bool registered;
    bool isPublic;
    int ownerCount;

    mapping (address => bool) owners;
    mapping (address => bool) writers;
    mapping (address => bool) readers;
    mapping (address => string) keys;
    mapping (address => string) publicKeys;

    mapping(string => Push) pushes;
    mapping(string => Push) headShas;

    string blobStoreMeta;
  }

  mapping(string => Repo) public repos;

  struct Push {
    string tag;
    string headSha;
    string packSha;

    string previousPushHeadSha;
  }

  function push(
    string memory repoName,
    string memory tag,
    string memory headSha,
    string memory packSha) public {

    Repo storage repo = repos[repoName];

    require(repo.registered, "Cannot push to a repo that has not been registered");

    require(
      hasOwner(repo, msg.sender) || hasWriter(repo, msg.sender),
      "Cannot push to a repo that you are not a writer or owner of"
    );

    Push storage p = repo.pushes[tag];

    string memory previousPushHeadSha = p.headSha;

    p.tag = tag;
    p.headSha = headSha;
    p.packSha = packSha;
    p.previousPushHeadSha = previousPushHeadSha;

    repo.headShas[headSha] = p;
  }

  function register(string memory name, string memory blobStoreMeta) public {
    _registerRepo(name, blobStoreMeta);

    Repo storage r = repos[name];
    r.isPublic = true;
    _addOwner(r, msg.sender);
  }

  function registerPrivate(
    string memory name,
    string memory blobStoreMeta,
    string memory encryptedKey,
    string memory publicKey) public {

    _registerRepo(name, blobStoreMeta);

    Repo storage r = repos[name];
    r.isPublic = false;

    _addOwner(r, msg.sender);
    r.keys[msg.sender] = encryptedKey;
    r.publicKeys[msg.sender] = publicKey;
  }

  function addOwner(string memory repoName, address newOwner) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can add new owners");
    _addOwner(repos[repoName], newOwner);
  }

  function addOwnerToPrivateRepo(
    string memory repoName,
    address newOwner,
    string memory encryptedKey,
    string memory publicKey
  ) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can add new owners");

    Repo storage r = repos[repoName];

    _addOwner(r, newOwner);
    r.keys[newOwner] = encryptedKey;
    r.publicKeys[newOwner] = publicKey;
  }

  function removeOwner(string memory repoName, address ownerToRemove) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can remove owners");
    _removeOwner(repos[repoName], ownerToRemove);
  }

  function addWriter(string memory repoName, address newWriter) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can add new writers");
    _addWriter(repos[repoName], newWriter);
  }

  function addWriterToPrivateRepo(
    string memory repoName,
    address newWriter,
    string memory encryptedKey,
    string memory publicKey
  ) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can add new writers");
    Repo storage r = repos[repoName];
    _addWriter(r, newWriter);
    r.keys[newWriter] = encryptedKey;
    r.publicKeys[newWriter] = publicKey;
  }

  function removeWriter(string memory repoName, address writerToRemove) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can remove writers");
    _removeWriter(repos[repoName], writerToRemove);
  }

  function addReader(
    string memory repoName,
    address newReader,
    string memory encryptedKey,
    string memory publicKey
  ) public {

    require(isOwner(repoName, msg.sender), "Only repo owners can add new readers");
    _addReader(repos[repoName], newReader, encryptedKey, publicKey);
  }

  function removeReader(string memory repoName, address readerToRemove) public {
    require(isOwner(repoName, msg.sender), "Only repo owners can remove readers");
    _removeReader(repos[repoName], readerToRemove);
  }

  function head(string memory repoName, string memory tag) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    Push storage p = r.pushes[tag];
    return p.headSha;
  }

  function pack(string memory repoName, string memory headSha) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    Push storage p = r.headShas[headSha];
    return p.packSha;
  }

  function previousPushHeadSha(string memory repoName, string memory headSha) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    Push storage p = r.headShas[headSha];
    return p.previousPushHeadSha;
  }

  function isOwner(string memory repoName, address account) public view returns (bool) {
    return hasOwner(repos[repoName], account);
  }

  function isWriter(string memory repoName, address account) public view returns (bool) {
    return hasWriter(repos[repoName], account);
  }

  function isReader(string memory repoName, address account) public view returns (bool) {
    return hasReader(repos[repoName], account);
  }

  function isPublic(string memory repoName) public view returns (bool) {
    return repos[repoName].isPublic;
  }

  function isPrivate(string memory repoName) public view returns (bool) {
    return !repos[repoName].isPublic;
  }

  function publicKey(string memory repoName, address account) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    require(!r.isPublic, "Repo is not a private repo");

    require(account != address(0), "Null address checked");

    return r.publicKeys[account];
  }

  function encryptedKey(string memory repoName, address account) public view returns (string memory) {
    Repo storage r = repos[repoName];
    require(r.registered, "Repo is not registered");
    require(!r.isPublic, "Repo is not a private repo");

    require(account != address(0), "Null address checked");

    return r.keys[account];
  }

  function _registerRepo(string memory name, string memory blobStoreMeta) internal {
    Repo storage r = repos[name];

    require(!r.registered, "Repo already exists");
    r.registered = true;
    r.blobStoreMeta = blobStoreMeta;
  }

  function _addOwner(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(!hasOwner(repo, account), "Address is already owner");

    repo.owners[account] = true;
    repo.ownerCount += 1;
  }

  function _removeOwner(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(hasOwner(repo, account), "Address is not owner");
    require(repo.ownerCount > 1, "Cannot remove the last owner from a repo");

    repo.owners[account] = false;
    repo.ownerCount -= 1;
  }

  function hasOwner(Repo storage repo, address account) internal view returns (bool) {
    require(account != address(0), "Null address checked");
    return repo.owners[account];
  }

  function _addWriter(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(!hasWriter(repo, account), "Address is already writer");

    repo.writers[account] = true;
  }

  function _removeWriter(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(hasWriter(repo, account), "Address is not writer");

    repo.writers[account] = false;
  }

  function hasWriter(Repo storage repo, address account) internal view returns (bool) {
    require(account != address(0), "Null address checked");
    return repo.writers[account];
  }

  function _addReader(
    Repo storage repo,
    address account,
    string memory _encryptedKey,
    string memory _publicKey
  ) internal {

    require(!repo.isPublic, "Readers cannot be added to public repos");
    require(account != address(0), "Null address checked");
    require(!hasReader(repo, account), "Address is already reader");

    repo.readers[account] = true;
    repo.keys[account] = _encryptedKey;
    repo.publicKeys[account] = _publicKey;
  }

  function _removeReader(Repo storage repo, address account) internal {
    require(account != address(0), "Null address checked");
    require(hasReader(repo, account), "Address is not reader");

    repo.readers[account] = false;
  }

  function hasReader(Repo storage repo, address account) internal view returns (bool) {
    require(account != address(0), "Null address checked");
    return repo.readers[account];
  }
}
