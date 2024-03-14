from io import BytesIO
from urllib.request import urlopen
import json
from zipfile import ZipFile, ZIP_DEFLATED
from pathlib import Path
import shutil
import subprocess
import os


def extractJar(version: str, version_manifest):
   if (version in ['release','snapshot']):
      version_name = version_manifest['latest'][version]
   else:
      version_name = version
   print("Extracting Minecraft Jar Version " + version_name)
   version_url = next(
       filter(lambda v: v['id'] == version_name, version_manifest['versions']))['url']
   with urlopen(version_url) as version_data:
      version_json = json.loads(version_data.read().decode())
      jar_url = version_json['downloads']['client']['url']
      with urlopen(jar_url) as jar_data:
         with ZipFile(BytesIO(jar_data.read())) as jar_archive:
            for file in jar_archive.infolist():
               if file.is_dir():
                  continue
               if file.filename.startswith('data/minecraft/structures/pillager_outpost/') \
                       or file.filename.startswith('data/minecraft/structures/village/') \
                       or file.filename.startswith('data/minecraft/structures/bastion/') \
                       or file.filename.startswith('data/minecraft/structures/ancient_city/') \
                       or file.filename.startswith('data/minecraft/structures/trail_ruins/') \
                       or file.filename.startswith('data/minecraft/structures/trial_chambers/') \
                       or file.filename.startswith('data/minecraft/worldgen/'):
                  jar_archive.extract(file, "/tmp/minecraft/" + version + "/")
               if file.filename.startswith('data/minecraft/datapacks/update_1_21/data/minecraft/worldgen/'):
                  file.filename = file.filename[37:] 
                  jar_archive.extract(file, "/tmp/minecraft/" + version + "/" )

# legacy vanilla worldgen zip
def extractWorldgenZip(version):
   print("-> Extracting worldgen zip file")

   if version == "1.16.5":
      url = "https://github.com/slicedlime/examples/raw/80fb4b8418ff3ff5724f4a0438bb422f58960bd9/vanilla_worldgen.zip"
   elif version == "1.17.1":
      url = "https://github.com/slicedlime/examples/raw/7c54f55409f395a0aa517729669b20d570969f30/vanilla_worldgen.zip"
   elif version == "1.18.2":
      url = "https://github.com/slicedlime/examples/raw/d766a7028865fc210bef3ddcffb54886cdaf4860/vanilla_worldgen.zip"
   elif version == "1.19.2":
      url =  "https://github.com/slicedlime/examples/raw/5d5e803876418f53c436ff62cc7e6dd602506cac/vanilla_worldgen.zip"
   else:
      raise ValueError("Unsupported worldgen zip version")

   with urlopen(url) as zip_data:
         with ZipFile(BytesIO(zip_data.read())) as archive:
            for file in archive.namelist():
               if file.startswith('worldgen/template_pool/') \
                       or file.startswith('worldgen/configured_structure_feature/') \
                       or file.startswith('worldgen/structure/'):
                  archive.extract(file, "/tmp/minecraft/" + version + "/data/minecraft/")

def zipdir(path, root_len_delta, ziph):
   pl = len(path) - root_len_delta
   # ziph is zipfile handle
   for root, dirs, files in os.walk(path):
      for file in files:
         ziph.write(os.path.join(root, file), os.path.join(root, file)[pl:])

def createZips(version, zip_version):
   zf = ZipFile("public/zips/data_" + zip_version + ".zip", 'w', ZIP_DEFLATED)
   zipdir("/tmp/minecraft/" + version + "/data", 4, zf)
   zf.close()


dirpath = Path('/tmp/minecraft/')
if dirpath.exists() and dirpath.is_dir():
    shutil.rmtree(dirpath)

with urlopen('https://launchermeta.mojang.com/mc/game/version_manifest.json') as version_manifest_data:
   version_manifest = json.loads(version_manifest_data.read().decode())
   extractJar("1.16.5", version_manifest)
   extractWorldgenZip('1.16.5')

   extractJar("1.17.1", version_manifest)
   extractWorldgenZip('1.17.1')

   extractJar("1.18.2", version_manifest)
   extractWorldgenZip('1.18.2')

   extractJar("1.19.2", version_manifest)
   extractWorldgenZip('1.19.2')

   extractJar("1.20.2", version_manifest)
   extractJar("1.20.4", version_manifest)
   extractJar("24w11a", version_manifest)

   createZips("1.16.5", "1_16")
   createZips("1.17.1", "1_17")
   createZips("1.18.2", "1_18")
   createZips("1.19.2", "1_19")
   createZips("1.20.2", "1_20")
   createZips("1.20.4", "1_20_4")
   createZips("24w11a", "24w11a")