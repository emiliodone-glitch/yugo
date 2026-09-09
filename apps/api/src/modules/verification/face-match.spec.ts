import { CompareFacesCommand } from '@aws-sdk/client-rekognition';
import {
  AUTO_APPROVE_SIMILARITY,
  createFaceComparator,
  ExternalFaceComparator,
  RekognitionFaceComparator,
  resolveAutoApproveThreshold,
  shouldAutoApprove,
  StubFaceComparator,
} from './face-match';

/**
 * RF-VER-01. Which face-matching vendor runs, and how its answer is read, is
 * decided entirely by configuration. These cases pin the selection rules and
 * the Rekognition mapping so a misconfigured deployment degrades to human
 * review instead of approving identities on a wrong score.
 */
describe('createFaceComparator', () => {
  it('usa el stub cuando no hay proveedor configurado', () => {
    expect(createFaceComparator({})).toBeInstanceOf(StubFaceComparator);
    expect(createFaceComparator({ FACE_MATCH_URL: '  ' })).toBeInstanceOf(StubFaceComparator);
  });

  it('usa el vendor HTTP cuando hay FACE_MATCH_URL', () => {
    const comparator = createFaceComparator({ FACE_MATCH_URL: 'https://faces.example/compare' });
    expect(comparator).toBeInstanceOf(ExternalFaceComparator);
  });

  it('usa Rekognition cuando FACE_MATCH_PROVIDER=rekognition, aunque haya URL', () => {
    const comparator = createFaceComparator({
      FACE_MATCH_PROVIDER: 'rekognition',
      FACE_MATCH_URL: 'https://faces.example/compare',
      S3_BUCKET: 'yugo-prod',
      S3_ACCESS_KEY: 'AKIA',
      S3_SECRET_KEY: 'secret',
      S3_REGION: 'us-east-1',
    });
    expect(comparator).toBeInstanceOf(RekognitionFaceComparator);
  });

  it('acepta el nombre del proveedor sin distinguir mayúsculas', () => {
    expect(createFaceComparator({ FACE_MATCH_PROVIDER: ' Rekognition ' })).toBeInstanceOf(
      RekognitionFaceComparator,
    );
  });

  it('un proveedor desconocido cae en el stub o en la URL, nunca en Rekognition', () => {
    expect(createFaceComparator({ FACE_MATCH_PROVIDER: 'other' })).toBeInstanceOf(
      StubFaceComparator,
    );
    expect(
      createFaceComparator({ FACE_MATCH_PROVIDER: 'other', FACE_MATCH_URL: 'https://x.test' }),
    ).toBeInstanceOf(ExternalFaceComparator);
  });
});

describe('RekognitionFaceComparator', () => {
  const build = (send: jest.Mock) =>
    new RekognitionFaceComparator({ bucket: 'yugo-media', client: { send } as never });

  it('manda ambas imágenes como objetos S3 del bucket con umbral 0', async () => {
    const send = jest.fn().mockResolvedValue({ FaceMatches: [] });
    await build(send).compare('selfies/u1/abc', 'photos/u1/main');

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as CompareFacesCommand;
    expect(command).toBeInstanceOf(CompareFacesCommand);
    expect(command.input).toEqual({
      SourceImage: { S3Object: { Bucket: 'yugo-media', Name: 'selfies/u1/abc' } },
      TargetImage: { S3Object: { Bucket: 'yugo-media', Name: 'photos/u1/main' } },
      SimilarityThreshold: 0,
    });
  });

  it('devuelve la mejor similitud escalada a 0..1', async () => {
    const send = jest.fn().mockResolvedValue({
      FaceMatches: [{ Similarity: 41.2 }, { Similarity: 97.5 }, { Similarity: 63 }],
    });
    await expect(build(send).compare('a', 'b')).resolves.toBeCloseTo(0.975, 5);
  });

  it('devuelve 0 cuando no hay coincidencias', async () => {
    await expect(
      build(jest.fn().mockResolvedValue({ FaceMatches: [] })).compare('a', 'b'),
    ).resolves.toBe(0);
    await expect(build(jest.fn().mockResolvedValue({})).compare('a', 'b')).resolves.toBe(0);
  });

  it('ignora coincidencias sin puntaje', async () => {
    const send = jest.fn().mockResolvedValue({ FaceMatches: [{}, { Similarity: 80 }] });
    await expect(build(send).compare('a', 'b')).resolves.toBeCloseTo(0.8, 5);
  });

  it('propaga el error del cliente para que el caso vaya a revisión', async () => {
    const send = jest.fn().mockRejectedValue(new Error('AccessDeniedException'));
    await expect(build(send).compare('a', 'b')).rejects.toThrow('AccessDeniedException');
  });
});

describe('resolveAutoApproveThreshold', () => {
  it('usa 0.93 por defecto', () => {
    expect(AUTO_APPROVE_SIMILARITY).toBe(0.93);
    expect(resolveAutoApproveThreshold({})).toBe(AUTO_APPROVE_SIMILARITY);
    expect(resolveAutoApproveThreshold({ FACE_MATCH_AUTO_APPROVE: '' })).toBe(
      AUTO_APPROVE_SIMILARITY,
    );
  });

  it('acepta un valor válido entre 0 y 1', () => {
    expect(resolveAutoApproveThreshold({ FACE_MATCH_AUTO_APPROVE: '0.97' })).toBe(0.97);
    expect(resolveAutoApproveThreshold({ FACE_MATCH_AUTO_APPROVE: ' 0.9 ' })).toBe(0.9);
    expect(resolveAutoApproveThreshold({ FACE_MATCH_AUTO_APPROVE: '1' })).toBe(1);
  });

  it.each(['abc', '1.5', '-0.1', '0', 'NaN', 'Infinity', '93'])(
    'con "%s" vuelve al valor por defecto',
    (raw) => {
      expect(resolveAutoApproveThreshold({ FACE_MATCH_AUTO_APPROVE: raw })).toBe(
        AUTO_APPROVE_SIMILARITY,
      );
    },
  );

  it('el umbral configurado gobierna la auto-aprobación', () => {
    expect(shouldAutoApprove(true, 0.95, 0.97)).toBe(false);
    expect(shouldAutoApprove(true, 0.95, 0.9)).toBe(true);
    expect(shouldAutoApprove(true, null, 0.1)).toBe(false);
    expect(shouldAutoApprove(false, 1, 0.1)).toBe(false);
  });
});
