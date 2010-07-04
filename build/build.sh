#! /bin/sh

usage="Usage: $0 [-v version] directory"

version=""

while getopts 'v:' option
do	case "$option" in
	v)	version="$OPTARG";;
	[?])	print >&2 $usage
		exit 1;;
	esac
done
shift $(($OPTIND - 1))

if [ ! $1 ] 
then
	echo "Parameter missing"	
	echo $usage
	exit 1
fi

currentdate=$(date +%Y%m%d)
fulldate=$(date +%Y%m%d%H%M%S)
tmpdir=_tmp_$fulldate

if [ $version ] 
then
	extensionname=wmsinspector.$version.$currentdate.xpi
else
	extensionname=wmsinspector.$currentdate.xpi
fi

cp -R $1 $tmpdir

cd $tmpdir

cd chrome
zip -qrm wmsinspector.jar .

cd ..

sed -i 's/chrome\//jar:chrome\/wmsinspector.jar!\//g' chrome.manifest

zip -qr ../$extensionname . -x .git\*

cd ..

rm -rf $tmpdir

echo "XPI file created: "$extensionname

