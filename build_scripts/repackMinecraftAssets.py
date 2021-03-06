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
            for file in jar_archive.namelist():
               if file.startswith('assets/minecraft/blockstates/') \
                       or file.startswith('assets/minecraft/models/block/') \
                       or file.startswith('assets/minecraft/textures/block/') \
                       or file.startswith('assets/minecraft/textures/block/') \
                       or file.startswith('assets/minecraft/textures/entity/chest/') \
                       or file.startswith('data/minecraft/structures/pillager_outpost/') \
                       or file.startswith('data/minecraft/structures/village/') \
                       or file.startswith('data/minecraft/structures/bastion/'):
                  jar_archive.extract(file, "/tmp/minecraft/" + version + "/")

def extractWorldgenZip(version):
   print("-> Extracting worldgen zip file")

   if version == "1.16.5":
      url = "https://github.com/slicedlime/examples/raw/80fb4b8418ff3ff5724f4a0438bb422f58960bd9/vanilla_worldgen.zip"
   elif version == "1.17":
      url = "https://github.com/slicedlime/examples/raw/23b9ac1ba5eceab976d7bdfef27707c2a44709ea/vanilla_worldgen.zip"
   else:
      url =  "https://github.com/slicedlime/examples/raw/master/vanilla_worldgen.zip"

   with urlopen(url) as zip_data:
         with ZipFile(BytesIO(zip_data.read())) as archive:
            for file in archive.namelist():
               if file.startswith('worldgen/template_pool/') \
                       or file.startswith('worldgen/configured_structure_feature/'):
                  archive.extract(file, "/tmp/minecraft/" + version + "/data/minecraft/")

def zipdir(path, root_len_delta, ziph):
   pl = len(path) - root_len_delta
   # ziph is zipfile handle
   for root, dirs, files in os.walk(path):
      for file in files:
         ziph.write(os.path.join(root, file), os.path.join(root, file)[pl:])

def createZips(version, zip_version):
   zf = ZipFile("public/zips/assets_" + zip_version + ".zip", 'w', ZIP_DEFLATED)
   zipdir("/tmp/minecraft/" + version + "/assets", 0, zf)
   zf.close()

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

   extractJar("1.17", version_manifest)
   extractWorldgenZip('1.17')

   extractJar("snapshot", version_manifest)
   extractWorldgenZip('snapshot')

   createZips("1.16.5", "1_16")
   createZips("1.17", "1_17")
   createZips("snapshot", "snapshot")