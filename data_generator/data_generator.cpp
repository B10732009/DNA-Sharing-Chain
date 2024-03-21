#include <iostream>
#include <fstream>
#include <string>
#include <array>
#include <cstdlib>

using namespace std;

const unsigned int RAND_SEED = 0;
const array<string, 24> CHROM = {
    "chr1",
    "chr2",
    "chr3",
    "chr4",
    "chr5",
    "chr6",
    "chr7",
    "chr8",
    "chr9",
    "chr10",
    "chr11",
    "chr12",
    "chr13",
    "chr14",
    "ch15",
    "chr16",
    "chr17",
    "chr18",
    "chr19",
    "chr20",
    "chr21",
    "chr22",
    "chrX",
    "chrY",
};
const unsigned int MIN_POS = 10000000;
const unsigned int MAX_POS = 24900000;
const array<string, 4> ID = {".", "rs6054257", "rs6040355", "microsat1"};
const array<char, 4> BASE = {'A', 'T', 'G', 'C'};
const unsigned int MIN_QUAL = 30;
const unsigned int MAX_QUAL = 100;
const array<string, 2> FILTER = {"PASS", "q10"};

const unsigned int MIN_DP = 30;
const unsigned int MAX_DP = 100;
const unsigned int MIN_AF = 1;
const unsigned int MAX_AF = 9;
const double COEF_AF = 0.1;
const array<string, 3> GT = {"0/0", "0/1", "1/1"};
const unsigned int MIN_DP_SAMPLE = 10;
const unsigned int MAX_DP_SAMPLE = 40;

int main(int argc, char *argv[])
{
    if (argc != 3)
    {
        cout << "Usage: ./data_generator.cpp <output_file_path> <record_number>." << endl;
        return 1;
    }

    string path(argv[1]);
    if (path.size() <= 4 || path.substr(path.size() - 4, 4) != ".vcf")
    {
        cout << "Invalid path name." << endl;
        return 1;
    }

    int num = stoi(argv[2]);

    ofstream ofs;
    ofs.open(path);
    if (!ofs.is_open())
    {
        cout << "Error: fail to create/open the file." << endl;
        return 1;
    }

    // generate header
    ofs << "##fileformat=VCFv4.3\n";
    ofs << "##fileDate=20240318\n";
    ofs << "##source=myFakeVariantCaller\n";
    ofs << "##reference=GRCh38\n";
    ofs << "##INFO=<ID=DP,Number=1,Type=Integer,Description=\"Total Depth\">\n";
    ofs << "##INFO=<ID=AF,Number=1,Type=Float,Description=\"Allele Frequency\">\n";
    ofs << "##FORMAT=<ID=GT,Number=1,Type=String,Description=\"Genotype\">\n";
    ofs << "##FORMAT=<ID=DP,Number=1,Type=Integer,Description=\"Read Depth\">\n";
    ofs << "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE1\n";

    // generate records
    srand(RAND_SEED);
    for (int i = 0; i < num; ++i)
    {
        string chrom = CHROM[rand() % CHROM.size()];
        unsigned int pos = MIN_POS + (rand() % (MAX_POS - MIN_POS));
        string id = ID[rand() % ID.size()];
        char ref = BASE[rand() % BASE.size()];
        char alt = BASE[rand() % BASE.size()];
        while (ref == alt)
        {
            alt = BASE[rand() % BASE.size()];
        }
        unsigned int qual = MIN_QUAL + (rand() % (MAX_QUAL - MIN_QUAL));
        string filter = FILTER[rand() % FILTER.size()];
        unsigned int dp = MIN_DP + (rand() % (MAX_DP - MIN_DP));
        double af = (MIN_AF + (rand() % (MAX_AF - MIN_AF))) * COEF_AF;
        string gt = GT[rand() % GT.size()];
        unsigned int dp_sample = MIN_DP_SAMPLE + (rand() % (MAX_DP_SAMPLE - MIN_DP_SAMPLE));
        ofs << chrom << "\t" << pos << "\t" << id << "\t" << ref << "\t" << alt << "\t" << qual << "\t" << filter << "\t"
            << "DP=" << dp << ";AF=" << af << "\tGT:DP\t" << gt << ":" << dp_sample << "\n";
    }

    ofs.close();
    return 0;
}
