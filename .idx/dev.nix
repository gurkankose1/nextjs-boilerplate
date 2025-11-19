{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
  ];
  idx.extensions = [
    # Proje için önerilen VS Code eklentilerini buraya ekleyebilirsiniz.
    # Örnek: "vscodevim.vim"
  ];
  idx.previews = [
    {
      id = "web";
      command = [
        "npm"
        "run"
        "dev"
        "--"
        "--port"
        "$PORT"
        "--hostname"
        "0.0.0.0"
      ];
      manager = "web";
    }
  ];
}
